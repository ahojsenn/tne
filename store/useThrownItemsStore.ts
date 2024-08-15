import { defineStore } from "pinia";
import type { ThrownItem } from "~/types/thrownItem";

// this store keeps the throwns items for a while (deleted after timeout)...
// used for rendering the catchup pages 

export const useThrownItemsStore = defineStore('thrownItems', {
  state: () => {
    return { thrownItems: [] as ThrownItem[] };
  },
  actions: {
    throw(item: ThrownItem) {
      // console.log('in store.throw: %s was thrown', item.x)
      setTimeout((self) => self.delete(item), 5000, this);
      this.thrownItems.push(item);
    },
    delete(item: ThrownItem) {
      this.thrownItems = this.thrownItems.filter((i) => i.rnd !== item.rnd);
    }
  }
});
