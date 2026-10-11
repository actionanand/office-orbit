import { Pipe, PipeTransform } from '@angular/core';
import { renderInlineMarkdown } from './markdown-viewer.component';

@Pipe({
  name: 'inlineMarkdown',
})
export class InlineMarkdownPipe implements PipeTransform {
  transform(value: string): string {
    return renderInlineMarkdown(value);
  }
}
