/**
 * checkout service
 */

const UID = "api::product.product";
const ORDER_UID = "api::order.order";
const ORDER_ITEM_UID = "api::order-item.order-item";

export async function getProductById(productId: string) {
    return await strapi.documents(UID).findOne({
        documentId: productId
    });
}

export async function createOrder(data: any) {
    return await strapi.documents(ORDER_UID).create(data);
}

export async function createOrderItem(data: any) {
    return await strapi.documents(ORDER_ITEM_UID).create(data);
}