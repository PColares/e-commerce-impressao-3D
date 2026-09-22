// Onde os arquivos enviados (fotos de produto, e depois os modelos 3D) ficam
// guardados. Hoje é o disco local; trocar por R2/S3 é escrever outra
// implementação desta interface e mudar o provider no StorageModule.
export abstract class FileStorage {
  abstract save(content: Buffer, folder: string, originalName: string): Promise<{ url: string }>;
}
