export class ImpossibleError extends Error {
  constructor(message: string) {
    super(
      `This error should not be possible and implies a bug in combotest itself. Please file a bug report.\n\n${message}`,
    );
    this.name = "ImpossibleError";
  }
}
