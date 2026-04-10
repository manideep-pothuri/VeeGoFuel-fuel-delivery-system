package com.example.fueldelivery.dto;

public record AuthRequest(
        String name,
        String email,
        String password,
        String role,
        String phone
) {}