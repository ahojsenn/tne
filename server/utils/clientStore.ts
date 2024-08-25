import { Client } from "~/types/client";

export const clients = [] as Client[]


export function add_client(client: Client) {
  clients.push(client)
  console.log('client stored: %s', client.hero);
}

export function get_clientById(id: string) {
  return clients.find((c) => c.id === id)
}

export function get_clientBySocketId(socketId: string) {
  return clients.find((c) => c.socketId === socketId)
}

export function delete_clientBySocketId(socketId: string) {
  const index = clients.findIndex((c) => c.socketId === socketId)
  if (index > -1) {
    clients.splice(index, 1)
  }
}

export function delete_clientById(id: string) {
  const index = clients.findIndex((c) => c.id === id)
  if (index > -1) {
    clients.splice(index, 1)
  }
}

export function get_all_clients() {
  return clients
}





