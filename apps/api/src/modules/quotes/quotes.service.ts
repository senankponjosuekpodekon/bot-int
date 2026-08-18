import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote, QuoteStatus } from './quote.entity';
import { ProductsService } from '../products/products.service';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepo: Repository<Quote>,
    private readonly productsService: ProductsService,
  ) {}

  async findAll(tenantId: string, status?: QuoteStatus): Promise<Quote[]> {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.quoteRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: string, tenantId: string): Promise<Quote> {
    const quote = await this.quoteRepo.findOne({ where: { id, tenantId } });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  async create(tenantId: string, data: {
    leadId?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerCompany?: string;
    items: { productId?: string; description: string; quantity: number; unitPrice: number }[];
    taxRate?: number;
    notes?: string;
    validDays?: number;
  }): Promise<Quote> {
    const quoteNumber = await this.generateQuoteNumber(tenantId);

    const items = data.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = data.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (data.validDays || 30));

    const quote = this.quoteRepo.create({
      tenantId,
      leadId: data.leadId,
      quoteNumber,
      status: 'draft' as QuoteStatus,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerCompany: data.customerCompany,
      items,
      subtotal,
      taxRate,
      taxAmount,
      total,
      currency: 'EUR',
      notes: data.notes,
      validUntil,
    });

    const saved = await this.quoteRepo.save(quote);
    await this.generatePdf(saved);
    return saved;
  }

  async createFromFlow(
    tenantId: string,
    leadId: string,
    flowResponses: Record<string, string>,
  ): Promise<Quote> {
    const projectType = flowResponses.project || flowResponses.type || 'Service';
    const budget = flowResponses.budget || '';

    const products = await this.productsService.searchRelevant(tenantId, projectType);

    const items = products.length > 0
      ? products.map((p) => ({
          productId: p.id,
          description: p.name + (p.description ? ` — ${p.description.slice(0, 100)}` : ''),
          quantity: 1,
          unitPrice: p.price,
        }))
      : [{
          description: `Prestation ${projectType}`,
          quantity: 1,
          unitPrice: budget === 'small' ? 299 : budget === 'medium' ? 599 : 1499,
        }];

    return this.create(tenantId, {
      leadId,
      customerName: flowResponses.name || 'Client',
      customerEmail: flowResponses.email,
      customerPhone: flowResponses.phone,
      customerCompany: flowResponses.company,
      items,
      taxRate: 20,
      notes: `Devis généré automatiquement depuis le flow. Type: ${projectType}, Budget: ${budget}`,
      validDays: 30,
    });
  }

  async updateStatus(id: string, tenantId: string, status: QuoteStatus): Promise<Quote> {
    await this.quoteRepo.update({ id, tenantId }, { status });
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const quote = await this.findById(id, tenantId);
    if (quote.pdfPath && fs.existsSync(quote.pdfPath)) {
      fs.unlinkSync(quote.pdfPath);
    }
    await this.quoteRepo.delete({ id, tenantId });
  }

  async generatePdf(quote: Quote): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'quotes');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, `${quote.quoteNumber}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(24).fillColor('#1a1a1a').text('DEVIS', 50, 50);
    doc.fontSize(10).fillColor('#666').text(`N° ${quote.quoteNumber}`, 50, 80);
    doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString('fr-FR')}`, 50, 95);
    if (quote.validUntil) {
      doc.text(`Valable jusqu'au: ${new Date(quote.validUntil).toLocaleDateString('fr-FR')}`, 50, 110);
    }

    doc.moveDown(2);
    doc.fontSize(10).fillColor('#333').text('CLIENT:', 50, 150);
    doc.fillColor('#666').text(quote.customerName, 50, 165);
    if (quote.customerCompany) doc.text(quote.customerCompany, 50, 180);
    if (quote.customerEmail) doc.text(quote.customerEmail, 50, 195);
    if (quote.customerPhone) doc.text(quote.customerPhone, 50, 210);

    const tableTop = 250;
    doc.fontSize(9).fillColor('#1a1a1a');
    doc.text('Description', 50, tableTop, { width: 300 });
    doc.text('Qté', 360, tableTop, { width: 40, align: 'right' });
    doc.text('Prix unit.', 410, tableTop, { width: 70, align: 'right' });
    doc.text('Total', 490, tableTop, { width: 60, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#ccc').stroke();

    let y = tableTop + 30;
    for (const item of quote.items) {
      doc.fillColor('#333').fontSize(9);
      doc.text(item.description.slice(0, 60), 50, y, { width: 300 });
      doc.text(item.quantity.toString(), 360, y, { width: 40, align: 'right' });
      doc.text(`${item.unitPrice.toFixed(2)}€`, 410, y, { width: 70, align: 'right' });
      doc.text(`${item.total.toFixed(2)}€`, 490, y, { width: 60, align: 'right' });
      y += 25;
    }

    doc.moveTo(50, y).lineTo(550, y).strokeColor('#ccc').stroke();
    y += 20;

    doc.fontSize(10).fillColor('#666');
    doc.text('Sous-total:', 380, y, { width: 120, align: 'right' });
    doc.fillColor('#1a1a1a').text(`${parseFloat(quote.subtotal.toString()).toFixed(2)}€`, 490, y, { width: 60, align: 'right' });
    y += 20;

    if (quote.taxRate > 0) {
      doc.fillColor('#666').text(`TVA (${quote.taxRate}%):`, 380, y, { width: 120, align: 'right' });
      doc.fillColor('#1a1a1a').text(`${parseFloat(quote.taxAmount.toString()).toFixed(2)}€`, 490, y, { width: 60, align: 'right' });
      y += 20;
    }

    doc.fontSize(14).fillColor('#1a1a1a').font('Helvetica-Bold');
    doc.text('TOTAL:', 380, y, { width: 120, align: 'right' });
    doc.text(`${parseFloat(quote.total.toString()).toFixed(2)}€`, 490, y, { width: 60, align: 'right' });
    doc.font('Helvetica');

    if (quote.notes) {
      y += 40;
      doc.fontSize(9).fillColor('#666').text('Notes:', 50, y);
      doc.text(quote.notes, 50, y + 15, { width: 500 });
    }

    y += 80;
    doc.fontSize(8).fillColor('#999');
    doc.text('Ce devis est valable pendant la durée indiquée. Acceptation par signature ou retour email.', 50, y);

    doc.end();

    await new Promise<void>((resolve) => {
      stream.on('finish', () => resolve());
    });

    await this.quoteRepo.update(quote.id, { pdfPath: filePath });
    this.logger.log(`PDF generated: ${filePath}`);
    return filePath;
  }

  private async generateQuoteNumber(tenantId: string): Promise<string> {
    const count = await this.quoteRepo.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    return `DEV-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
