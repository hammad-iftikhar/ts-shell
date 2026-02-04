import { createInterface } from "readline";
import path from "path";
import { getFiles } from "./helpers.ts";
import fs from 'fs/promises';
import child_process from "child_process";
import util from "util";

function exitProgram() {
  process.exit(0);
}

const execSync = util.promisify(child_process.exec);

const BUILTINS = ["echo", "exit", "type", "pwd", "cd"];

async function searchExecutableInPath(name: string) {
  const PATH = process.env.PATH;

  if (!PATH) {
    return false;
  }

  let dirs = PATH.split(path.delimiter);

  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i];

    const files = getFiles(dir);

    while (true) {
      let next = await files.next(),
        value = next.value,
        done = next.done;

      try {
        await fs.access(value, fs.constants.X_OK)

        let fileName = path.basename(value);

        if (fileName == name) {
          return value;
        }

      } catch { }

      if (done) {
        break;
      }
    }
  }

  return false;

}

async function handleCommand(command: string, args: string[]) {

  if (BUILTINS.includes(command)) {

    switch (command) {

      case "exit":
        exitProgram();
        break;

      case "echo":
        console.log(args.join(" "));
        break;

      case "type":
        if (args.length > 0) {
          let arg = args[0];

          if (BUILTINS.includes(arg)) {
            console.log(`${arg} is a shell builtin`);
          } else {

            if (args.length > 0) {
              let executablePath = await searchExecutableInPath(args[0]);

              if (executablePath) {
                console.log(`${arg} is ${executablePath}`);
              } else {
                console.log(`${arg}: not found`);
              }

            }
          }
        }
        break;

      case "pwd":
        console.log(process.cwd());
        break;

      case "cd":

        if (args.length > 0) {

          let absPath = args[0];

          if (absPath.startsWith("~")) {
            absPath = process.env.HOME + absPath.replace("~", "");
          }

          try {
            process.chdir(absPath);
          } catch (err: any) {
            if (err.code == "ENOENT") {
              console.log(`cd: ${absPath}: No such file or directory`)
            }
          }
        }
        break;
    }
  } else {

    let executablePath = await searchExecutableInPath(command);

    if (executablePath) {

      try {
        let res = await execSync(`${command} ${args.join(" ")}`)
        console.log(res.stdout.trimEnd());
      } catch (err) {
        console.log(`${command}: ${err}`);
      }
    } else {
      console.log(`${command}: command not found`);
    }
  }

}

function parseArguments(args: string[]) {
  let argStr = args.join(" ");

  console.log(argStr);

  return args;
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.setPrompt('$ ');
rl.prompt();

rl.on('line', async function (input) {
  input = input.trim();

  if (input) {

    const inputParts = input.split(" ");

    const command = inputParts[0],
      args = parseArguments(inputParts.slice(1));


    await handleCommand(command, args);
  }

  rl.prompt();

});

rl.on('close', function () {
  exitProgram();
});