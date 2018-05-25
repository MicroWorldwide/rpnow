import { Component, OnInit, ChangeDetectionStrategy, Input, EventEmitter, Output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'rpn-banner-message',
  template: `
    <div *ngIf="messageHtml" fxLayout="row" fxLayoutAlign="center center">

      <span class="generated-links-contrast" [innerHTML]="messageHtml"></span>

      <button mat-icon-button (click)="onDismiss()">
        <mat-icon>close</mat-icon>
      </button>

    </div>
  `,
  styles: [`
    /* TODO figure out how to import this in an inline styles declaration */
    /* @import '~@angular/material/theming'; */

    div {
      text-align: center;
      padding: 5px;

      color: white;
      background-color: #7c4dff; /* mat-color($mat-deep-purple, "A200"); */
    }
    :host-context(.dark-theme) div {
      color: black;
      background-color: #ffab40; /* mat-color($mat-orange, "A200"); */
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BannerMessageComponent {

  constructor(private sanitizer: DomSanitizer) { }

  @Input() message: string;

  @Output() readonly dismiss: EventEmitter<string> = new EventEmitter();

  get messageHtml() {
    return this.message && this.sanitizer.bypassSecurityTrustHtml(this.message);
  }

  onDismiss() {
    this.dismiss.emit(this.message);
  }

}