import { EventEmitter } from 'events';
import { Response } from 'express';

export type EventType =
  | 'drive_created'
  | 'drive_status_changed'
  | 'application_created'
  | 'application_status_changed'
  | 'interview_scheduled'
  | 'email_campaign_sent'
  | 'student_imported'
  | 'company_verified'
  | 'system_sync';

export interface RealtimeEvent {
  type: EventType;
  payload: any;
  timestamp: string;
}

class RealtimeHub extends EventEmitter {
  private clients: Set<Response> = new Set();

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  addClient(res: Response) {
    this.clients.add(res);
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(type: EventType, payload: any) {
    const event: RealtimeEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.emit('broadcast', event);

    const message = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (e) {
        this.clients.delete(client);
      }
    }
  }
}

export const realtimeHub = new RealtimeHub();

