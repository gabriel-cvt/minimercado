package com.minimercado.backend.controller;

public class ApiRoutes {

    public static final String API = "/api";


    public static final String API_ORDER = API + "/orders";
    public static final String API_ORDER_GET = API_ORDER + "/{id}";
    public static final String API_ORDER_GET_BY_CLIENT = API_ORDER + "/client/{id}";
    public static final String API_ORDER_PUT = API_ORDER + "/{id}";
    public static final String API_ORDER_CANCEL = API_ORDER + "/{id}/cancel";

}
