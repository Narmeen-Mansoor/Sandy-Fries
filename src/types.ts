export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  functionCalls?: any[] | null;
  isTriggeredEffect?: boolean;
}

export interface Cart {
  quantity: number;
  pricePerBag: number;
  deliveryFee: number;
  city: string;
  area: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: "product" | "cooking" | "delivery";
}
