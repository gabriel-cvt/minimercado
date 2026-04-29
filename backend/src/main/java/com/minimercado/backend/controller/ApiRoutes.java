package com.minimercado.backend.controller;

public class ApiRoutes {

    public static final String API = "/api";


    public static final String API_ORDER = API + "/orders";
    public static final String API_ORDER_ID = API_ORDER + "/{id}";
    public static final String API_ORDER_GET_BY_CLIENT = API_ORDER + "/client/{id}";
    public static final String API_ORDER_CANCEL = API_ORDER + "/{id}/cancel";

    // Adicione em ApiRoutes.java
    public static final String API_PRODUCT = API + "/products";
    public static final String API_PRODUCT_ID = API_PRODUCT + "/{id}";
}
