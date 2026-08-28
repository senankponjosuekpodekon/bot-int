import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

@Injectable()
export class ChatEventsService extends EventEmitter {
  emitMessage(conversationId: string, payload: any) {
    this.emit(`message:${conversationId}`, payload);
  }

  emitTyping(conversationId: string, payload: any) {
    this.emit(`typing:${conversationId}`, payload);
  }

  onMessage(conversationId: string, callback: (payload: any) => void) {
    this.on(`message:${conversationId}`, callback);
  }

  offMessage(conversationId: string, callback: (payload: any) => void) {
    this.off(`message:${conversationId}`, callback);
  }

  onTyping(conversationId: string, callback: (payload: any) => void) {
    this.on(`typing:${conversationId}`, callback);
  }

  offTyping(conversationId: string, callback: (payload: any) => void) {
    this.off(`typing:${conversationId}`, callback);
  }
}
