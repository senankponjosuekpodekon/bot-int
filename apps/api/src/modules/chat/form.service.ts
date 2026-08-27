import { Injectable, Logger } from '@nestjs/common';
import { FlowFieldType } from '../flows/chat-flow.entity';
import { FlowsService } from '../flows/flows.service';
import { Conversation, ConversationState } from './conversation.entity';

export interface FlowData {
  id: string;
  title: string;
  fields: {
    id: string;
    type: FlowFieldType;
    label: string;
    placeholder?: string;
    options?: { label: string; value: string }[];
    required?: boolean;
  }[];
}

export interface FormResult {
  reply: string;
  completed: boolean;
  formState: NonNullable<Conversation['formState']>;
  summary?: string;
  extractedData?: Record<string, string>;
}

@Injectable()
export class FormService {
  private readonly logger = new Logger(FormService.name);

  constructor(private readonly flowsService: FlowsService) {}

  startFlow(flow: FlowData, language = 'fr'): FormResult {
    const missing = flow.fields.map((f) => f.id);
    const formState: NonNullable<Conversation['formState']> = {
      flowId: flow.id,
      currentStep: 0,
      collectedFields: {},
      missingFields: missing,
    };
    const firstField = flow.fields[0];
    const reply = firstField ? this.buildQuestion(firstField, language) : this.getFlowGreeting(flow.title, language);
    return { reply, completed: false, formState };
  }

  async processAnswer(
    tenantId: string,
    conversation: Conversation,
    userMessage: string,
    flow: FlowData,
    language = 'fr',
  ): Promise<FormResult> {
    const { currentStep = 0, collectedFields = {}, missingFields = [] } = conversation.formState || {};
    const field = flow.fields[currentStep];
    if (!field) {
      return this.completeFlow(tenantId, conversation, flow, collectedFields, language);
    }

    const value = this.extractFieldValue(field, userMessage);
    const updatedFields = { ...collectedFields, [field.id]: value };
    const nextStep = currentStep + 1;
    const nextField = flow.fields[nextStep];
    const remainingMissing = flow.fields.filter((f) => !(f.id in updatedFields)).map((f) => f.id);

    const formState: NonNullable<Conversation['formState']> = {
      flowId: flow.id,
      currentStep: nextStep,
      collectedFields: updatedFields,
      missingFields: remainingMissing,
    };

    if (remainingMissing.length === 0) {
      const result = await this.flowsService.processFlowResponse(tenantId, conversation.id, flow.id, updatedFields);
      return {
        reply: result.summary,
        completed: true,
        formState,
        summary: result.summary,
        extractedData: result.extractedData,
      };
    }

    return {
      reply: nextField ? this.buildQuestion(nextField, language) : this.getFlowGreeting(flow.title, language),
      completed: false,
      formState,
    };
  }

  private async completeFlow(
    tenantId: string,
    conversation: Conversation,
    flow: FlowData,
    collectedFields: Record<string, string>,
    language: string,
  ): Promise<FormResult> {
    const result = await this.flowsService.processFlowResponse(tenantId, conversation.id, flow.id, collectedFields);
    return {
      reply: result.summary,
      completed: true,
      formState: {
        flowId: flow.id,
        currentStep: flow.fields.length,
        collectedFields,
        missingFields: [],
      },
      summary: result.summary,
      extractedData: result.extractedData,
    };
  }

  private buildQuestion(field: FlowData['fields'][number], language: string): string {
    if (field.placeholder) {
      return `${field.label} (${field.placeholder})${field.required ? '' : ' — optionnel'}`;
    }

    const templates: Record<string, Record<string, string>> = {
      en: {
        text: `Please provide ${field.label}.`,
        email: 'Please provide your email.',
        phone: 'Please provide your phone number.',
        date: 'Please provide a date.',
        number: 'Please provide a number.',
        buttons: `Please choose ${field.label}.`,
        dropdown: `Please choose ${field.label}.`,
      },
      fr: {
        text: `Veuillez me donner ${field.label}.`,
        email: 'Veuillez me donner votre email.',
        phone: 'Veuillez me donner votre téléphone.',
        date: 'Veuillez me donner une date.',
        number: 'Veuillez me donner un nombre.',
        buttons: `Veuillez choisir ${field.label}.`,
        dropdown: `Veuillez choisir ${field.label}.`,
      },
    };

    const type = field.type;
    return (templates[language]?.[type] || templates[language]?.text || `Veuillez me donner ${field.label}.`) + (field.required ? '' : ' (optionnel)');
  }

  private getFlowGreeting(title: string, language: string): string {
    return language === 'fr' ? `Je vais vous guider pour ${title}.` : `I will guide you through ${title}.`;
  }

  private extractFieldValue(field: FlowData['fields'][number], userMessage: string): string {
    const trimmed = userMessage.trim().toLowerCase();
    switch (field.type) {
      case 'email':
        return (userMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) || [userMessage])[0];
      case 'phone':
        return (userMessage.match(/(?:\+|00)?[-0-9\s().]{8,}/) || [userMessage])[0].trim();
      case 'number':
        return (userMessage.match(/[0-9]+(?:[.,][0-9]+)?/) || [userMessage])[0];
      case 'date':
        return (userMessage.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/) || [userMessage])[0];
      case 'buttons':
      case 'dropdown':
        if (field.options) {
          const option = field.options.find(
            (o) => o.label.toLowerCase() === trimmed || o.value.toLowerCase() === trimmed,
          );
          return option ? option.value : userMessage;
        }
        return userMessage;
      default:
        return userMessage;
    }
  }
}
