module.exports = {
    routes: [
        {
            method: "GET",
            path: "/c/orders",
            handler: "order.find",
            config: {
             
            },
        },
        {
            method: "GET",
            path: "/c/orders/:id",
            handler: "order.findOne",
            config: {
             
            },
        },
        {
            method: "POST",
            path: "/c/orders",
            handler: "order.create",
            config: {
             
            },
        },
        {
            method: "PUT",
            path: "/c/orders/:id",
            handler: "order.update",
            config: {
             
            },
        },
        {
            method: "DELETE",
            path: "/c/orders/:id",
            handler: "order.delete",
            config: {
             
            },
        },
    ],
};