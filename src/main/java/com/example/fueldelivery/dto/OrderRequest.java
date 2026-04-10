package com.example.fueldelivery.dto;

public record OrderRequest(
        String buyerId,
        String listingId,
        Double litres,
        Double buyerLatitude,
        Double buyerLongitude,
        String paymentMethod
) {}