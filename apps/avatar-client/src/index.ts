export interface AvatarRenderer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class AvatarNotConfiguredError extends Error {
  constructor() {
    super("avatar não configurado: o renderer de sprites entra na F6a");
    this.name = "AvatarNotConfiguredError";
  }
}

export function createAvatarRenderer(): AvatarRenderer {
  throw new AvatarNotConfiguredError();
}
