package com.example.fueldelivery.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.fueldelivery.dto.ListingRequest;
import com.example.fueldelivery.model.FuelListing;
import com.example.fueldelivery.model.User;
import com.example.fueldelivery.repository.FuelListingRepository;
import com.example.fueldelivery.repository.UserRepository;

@RestController
@RequestMapping("/api/listings")
@CrossOrigin
public class FuelController {

    private final FuelListingRepository fuelListingRepository;
    private final UserRepository userRepository;

    public FuelController(FuelListingRepository fuelListingRepository, UserRepository userRepository) {
        this.fuelListingRepository = fuelListingRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<FuelListing> getAllListings() {
        return fuelListingRepository.findAll();
    }

    @GetMapping("/seller/{sellerId}")
    public List<FuelListing> getSellerListings(@PathVariable String sellerId) {
        return fuelListingRepository.findBySellerId(sellerId);
    }

    @PostMapping
    public ResponseEntity<?> createListing(@RequestBody ListingRequest request) {
        Optional<User> seller = userRepository.findById(request.sellerId());
        if (seller.isEmpty()) {
            return ResponseEntity.badRequest().body("Seller not found.");
        }

        if (!"SELLER".equalsIgnoreCase(seller.get().getRole())) {
            return ResponseEntity.badRequest().body("Only seller accounts can create listings.");
        }

        FuelListing listing = new FuelListing();
        listing.setSellerId(seller.get().getId());
        listing.setSellerName(seller.get().getName());
        listing.setStationName(request.stationName());
        listing.setFuelType(request.fuelType());
        listing.setAvailableLitres(request.availableLitres());
        listing.setPricePerLitre(request.pricePerLitre());
        listing.setLatitude(request.latitude());
        listing.setLongitude(request.longitude());
        listing.setStationPhone(request.stationPhone());
        listing.setCreatedAt(LocalDateTime.now());

        return ResponseEntity.ok(fuelListingRepository.save(listing));
    }
}