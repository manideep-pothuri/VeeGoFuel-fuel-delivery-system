package com.example.fueldelivery.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.example.fueldelivery.model.FuelListing;

public interface FuelListingRepository extends MongoRepository<FuelListing, String> {
    List<FuelListing> findBySellerId(String sellerId);
}