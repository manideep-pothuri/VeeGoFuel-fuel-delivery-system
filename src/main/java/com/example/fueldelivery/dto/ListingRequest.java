package com.example.fueldelivery.dto;

public record ListingRequest(
        String sellerId,
        String stationName,
        String fuelType,
        Double availableLitres,
        Double pricePerLitre,
        Double latitude,
        Double longitude,
        String stationPhone
) {}