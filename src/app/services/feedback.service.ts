import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

export type UiFeedbackKind = 'success' | 'error' | 'warning' | 'info' | 'confirmation';

export interface UiFeedbackRequest {
  kind: UiFeedbackKind;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  async success(title: string, message?: string): Promise<void> {
    await this.notify('success', title, message);
  }

  async error(title: string, message?: string): Promise<void> {
    await this.notify('error', title, message);
  }

  async warning(title: string, message?: string): Promise<void> {
    await this.notify('warning', title, message);
  }

  async info(title: string, message?: string): Promise<void> {
    await this.notify('info', title, message);
  }

  async confirm(request: UiFeedbackRequest): Promise<boolean> {
    const result = await Swal.fire({
      icon: request.destructive ? 'warning' : 'question',
      title: request.title,
      text: request.message,
      showCancelButton: true,
      confirmButtonText: request.confirmLabel ?? 'Confirmar',
      cancelButtonText: request.cancelLabel ?? 'Cancelar',
      confirmButtonColor: request.destructive ? 'var(--ym-danger)' : 'var(--ym-primary)',
      focusCancel: Boolean(request.destructive),
      reverseButtons: Boolean(request.destructive),
      returnFocus: true,
    });
    return result.isConfirmed === true;
  }

  private async notify(icon: SweetAlertIcon, title: string, message?: string): Promise<void> {
    const options: SweetAlertOptions = {
      icon,
      title,
      text: message,
      confirmButtonText: 'Entendi',
      returnFocus: true,
    };
    await Swal.fire(options);
  }
}
