import { defineStore } from "pinia";

// this is just to store the game status

export const useGameStore = defineStore('game', {
  state: () => ({
    gameMode: false,
  }),
  actions: {
    on() { this.gameMode = true; },
    off() { this.gameMode = false; },
    toggle() { this.gameMode = !this.isOn; },
    set(value: boolean) { this.gameMode = value; },
  },
  getters: {
    isOn: (state): boolean => state.gameMode,
  },
})