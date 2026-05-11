package com.minimercado.backend.controller;

public class ApiRoutes {

    public static final String API = "/api";


    public static final String API_ORDER = API + "/orders";
    public static final String API_ORDER_ID = API_ORDER + "/{id}";
    public static final String API_ORDER_GET_BY_CLIENT_CPF = API_ORDER + "/client/{cpf}";
    public static final String API_ORDER_CANCEL = API_ORDER + "/{id}/cancel";
    public static final String API_ORDER_MARK_AS_READY = API_ORDER_ID + "/ready";
    public static final String API_ORDER_MARK_AS_PAID = API_ORDER_ID + "/pay";
    public static final String API_ORDER_FINISH = API_ORDER_ID + "/finish";


    // Adicione em ApiRoutes.java
    public static final String API_PRODUCT = API + "/products";
    public static final String API_PRODUCT_ID = API_PRODUCT + "/{id}";

    public static final String API_CLIENT = API + "/clients";
    public static final String API_CLIENT_GET_CLIENT_BY_CPF = API_CLIENT + "/cpf/{cpf}";
}
