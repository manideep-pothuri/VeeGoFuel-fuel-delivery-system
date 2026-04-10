package com.example.fueldelivery.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.example.fueldelivery.model.Order;

public interface OrderRepository extends MongoRepository<Order, String> {
    List<Order> findByBuyerId(String buyerId);
    List<Order> findBySellerId(String sellerId);
    List<Order> findByDriverId(String driverId);
}