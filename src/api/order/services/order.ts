import { OrderCreatePayload } from "../../../../types/orders";

const UID = "api::order.order";

export async function findAll() {
  return await strapi.documents(UID).findMany();
}

export async function findAllByUserId(userId: string) {
  return await strapi.documents(UID).findMany({
    filters: {
      user: {
        id: userId,
      },
    }
  });
}

export async function findOne(id: string) {
  return await strapi.documents(UID).findOne({ documentId: id });
}

export async function findOneByIdAndUserId(id: string, userId: string) {
  return await strapi.documents(UID).findOne({
    documentId: id,
    filters: {
      user: {
        id: userId,
      },
    }
  });
}


export async function create(data: any) {
  return await strapi.documents(UID).create({
    data,
  });
}

export async function update(id: string, data: any) {
  return await strapi.documents(UID).update({
    documentId: id,
    data,
  });
}