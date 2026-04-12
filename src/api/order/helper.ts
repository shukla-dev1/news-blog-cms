export const getCreatePayloadOrderData = (bodyData: any, user: any) => {
    return {
        ...bodyData,
        user: user?.id,
    };
};