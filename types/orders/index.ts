import { ApiOrderOrder } from "../../types/generated/contentTypes";
export type Order = ApiOrderOrder['attributes'];

export type OrderCreatePayload = Pick<Order, 'totalAmount' | 'orderStatus' | 'paymentMethod' | 'paymentStatus' | 'phone' | 'user'>;


