import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { RpService } from '../../rp.service';

@Component({
  selector: 'app-image-dialog',
  templateUrl: 'image-dialog.html',
  styles: []
})
export class ImageDialogComponent {

  //https://github.com/angular/angular.js/blob/master/src/ngSanitize/filter/linky.js#L3
  private urlRegex = /^((ftp|https?):\/\/|(www\.)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]$/gi;

  loading: boolean = false;

  url: string = '';

  constructor(
    public rp: RpService,
    private dialogRef: MatDialogRef<ImageDialogComponent>
  ) { }

  ngOnInit() {
  }

  valid() {
    return this.url.match(this.urlRegex);
  }

  async submit() {
    this.loading = true;
    await this.rp.addImage(this.url);
    this.dialogRef.close();
  }

  cancel() {
    this.dialogRef.close();
  }

}

