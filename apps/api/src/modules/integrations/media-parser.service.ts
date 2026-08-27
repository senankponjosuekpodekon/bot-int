import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as mammoth from 'mammoth';
import { IntegrationsService } from './integrations.service';

@Injectable()
export class MediaParserService {
  private readonly logger = new Logger(MediaParserService.name);

  constructor(private readonly integrationsService: IntegrationsService) {}

  async parseMedia(tenantId: string, channel: string, mediaInfo: any): Promise<string> {
    if (channel === 'whatsapp') {
      return this.parseWhatsAppMedia(tenantId, mediaInfo);
    }
    return `[Média ${mediaInfo?.type || 'inconnu'} reçu depuis ${channel}]`;
  }

  private async parseWhatsAppMedia(tenantId: string, mediaInfo: any): Promise<string> {
    const { type, id, filename, mime, caption } = mediaInfo || {};

    if (type === 'image') {
      return caption ? `[Image reçue. Légende: ${caption}]` : '[Image reçue. Veuillez décrire le contenu si important.]';
    }

    if (type === 'audio') {
      return '[Audio reçu. Veuillez le transcrire si nécessaire.]';
    }

    if (type === 'video') {
      return '[Vidéo reçue. Veuillez décrire le contenu si important.]';
    }

    if (type === 'document' && id) {
      try {
        const file = await this.downloadWhatsAppMedia(tenantId, id);
        const text = await this.extractText(file.buffer, file.mime || mime);
        return `Document reçu: ${filename || 'fichier'}\n\n${text}`.slice(0, 4000);
      } catch (err: any) {
        this.logger.warn(`WhatsApp document parsing failed: ${err?.message}`);
        return `[Document reçu: ${filename || 'fichier'} — impossible d'extraire le texte]`;
      }
    }

    return `[Média ${type || 'inconnu'} reçu]`;
  }

  private async downloadWhatsAppMedia(tenantId: string, mediaId: string): Promise<{ buffer: Buffer; mime: string }> {
    const integration = await this.integrationsService.findByType(tenantId, 'whatsapp');
    if (!integration?.enabled || !integration.config?.accessToken) {
      throw new Error('WhatsApp not configured');
    }

    const accessToken = integration.config.accessToken;
    const meta = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
      params: { access_token: accessToken },
    });

    const downloadUrl = meta.data?.url;
    if (!downloadUrl) {
      throw new Error('WhatsApp media URL not found');
    }

    const download = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return {
      buffer: Buffer.from(download.data),
      mime: meta.data?.mime_type || download.headers['content-type'] || 'application/octet-stream',
    };
  }

  private async extractText(buffer: Buffer, mime: string): Promise<string> {
    if (mime === 'text/plain' || mime === 'text/markdown') {
      return buffer.toString('utf-8').slice(0, 4000);
    }

    if (mime === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default || (await import('pdf-parse'));
      const parsed = await (pdfParse as any)(buffer);
      return (parsed?.text || '').toString().slice(0, 4000);
    }

    if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/msword' ||
      mime === 'application/vnd.oasis.opendocument.text'
    ) {
      const parsed = await mammoth.extractRawText({ buffer });
      return parsed.value.slice(0, 4000);
    }

    return 'Format non pris en charge pour extraction de texte.';
  }
}
