import fs from 'fs/promises';
import path from 'path';

export async function* getFiles(dir: string): AsyncGenerator<string> {

    try {
        const dirents = await fs.readdir(dir, { withFileTypes: true });

        for (const dirent of dirents) {
            const res = path.resolve(dir, dirent.name);
            if (dirent.isDirectory()) {
                yield* getFiles(res);
            } else {
                yield res;
            }
        }
    } catch { }

}
