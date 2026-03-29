declare module 'word-extractor' {
  interface WordDocument {
    getBody(): string;
    getFootnotes(): string;
    getEndnotes(): string;
    getHeaders(options?: unknown): string;
  }

  export default class WordExtractor {
    extract(input: string | Buffer): Promise<WordDocument>;
  }
}
