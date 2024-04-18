// ~/types/index.d.ts

export { MyGlobal };

declare global {
  interface MyGlobal {
    io: Server
  }
}