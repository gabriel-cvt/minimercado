package com.minimercado.backend.controller;

public class ApiRoutes {

    public static final String API = "/api";


    public static final String API_ORDER = API + "/orders";
    public static final String API_ORDER_PUBLIC = API_ORDER + "/public";
    public static final String API_ORDER_ID = API_ORDER + "/{id}";
    public static final String API_ORDER_CANCEL = API_ORDER + "/{id}/cancel";
    public static final String API_ORDER_MARK_AS_READY = API_ORDER_ID + "/ready";
    public static final String API_ORDER_MARK_AS_PAID = API_ORDER_ID + "/pay";
    public static final String API_ORDER_FINISH = API_ORDER_ID + "/finish";


    // Adicione em ApiRoutes.java
    public static final String API_PRODUCT = API + "/products";
    public static final String API_PRODUCT_ID = API_PRODUCT + "/{id}";
    public static final String API_PRODUCT_AVAILABILITY = API_PRODUCT_ID + "/availability";

    public static final String API_DASHBOARD = API + "/dashboard";
    public static final String API_DASHBOARD_SUMMARY = API_DASHBOARD + "/summary";
    public static final String API_DASHBOARD_ANALYTICS = API_DASHBOARD + "/analytics";
    public static final String API_DASHBOARD_TOP_PRODUCTS = API_DASHBOARD + "/top-products";

    public static final String API_SETTINGS_PUBLIC = API + "/settings/public";
    public static final String API_SETTINGS = API + "/settings";
    public static final String API_SETTINGS_RESET = API_SETTINGS + "/reset";
    public static final String API_AUTH_VERIFY = API + "/auth/verify";
}
