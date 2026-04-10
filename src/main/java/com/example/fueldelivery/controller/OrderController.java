package com.example.fueldelivery.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.fueldelivery.dto.AssignDriverRequest;
import com.example.fueldelivery.dto.OrderRequest;
import com.example.fueldelivery.dto.StatusRequest;
import com.example.fueldelivery.model.FuelListing;
import com.example.fueldelivery.model.Order;
import com.example.fueldelivery.model.User;
import com.example.fueldelivery.repository.FuelListingRepository;
import com.example.fueldelivery.repository.OrderRepository;
import com.example.fueldelivery.repository.UserRepository;
import com.example.fueldelivery.util.GeoUtil;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin
public class OrderController {

    private final OrderRepository orderRepository;
    private final FuelListingRepository fuelListingRepository;
    private final UserRepository userRepository;

    public OrderController(OrderRepository orderRepository,
                           FuelListingRepository fuelListingRepository,
                           UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.fuelListingRepository = fuelListingRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/buyer/{buyerId}")
    public List<Order> buyerOrders(@PathVariable String buyerId) {
        return orderRepository.findByBuyerId(buyerId);
    }

    @GetMapping("/seller/{sellerId}")
    public List<Order> sellerOrders(@PathVariable String sellerId) {
        return orderRepository.findBySellerId(sellerId);
    }

    @GetMapping("/driver/{driverId}")
    public List<Order> driverOrders(@PathVariable String driverId) {
        return orderRepository.findByDriverId(driverId);
    }

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody OrderRequest request) {
        Optional<User> buyerOpt = userRepository.findById(request.buyerId());
        if (buyerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Buyer not found.");
        }

        if (!"BUYER".equalsIgnoreCase(buyerOpt.get().getRole())) {
            return ResponseEntity.badRequest().body("Only buyer accounts can place orders.");
        }

        Optional<FuelListing> listingOpt = fuelListingRepository.findById(request.listingId());
        if (listingOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Fuel listing not found.");
        }

        FuelListing listing = listingOpt.get();

        if (request.litres() <= 0) {
            return ResponseEntity.badRequest().body("Litres must be greater than zero.");
        }

        if (listing.getAvailableLitres() < request.litres()) {
            return ResponseEntity.badRequest().body("Not enough fuel available.");
        }

        double distanceKm = GeoUtil.distanceKm(
                listing.getLatitude(),
                listing.getLongitude(),
                request.buyerLatitude(),
                request.buyerLongitude()
        );

        double fuelCost = request.litres() * listing.getPricePerLitre();
        double deliveryCharge = Math.max(25.0, distanceKm * 12.0);
        double totalAmount = fuelCost + deliveryCharge;

        Order order = new Order();
        order.setBuyerId(buyerOpt.get().getId());
        order.setBuyerName(buyerOpt.get().getName());
        order.setBuyerPhone(buyerOpt.get().getPhone());

        order.setSellerId(listing.getSellerId());
        order.setSellerName(listing.getSellerName());
        order.setStationName(listing.getStationName());

        order.setListingId(listing.getId());
        order.setFuelType(listing.getFuelType());
        order.setLitres(request.litres());

        order.setBuyerLatitude(request.buyerLatitude());
        order.setBuyerLongitude(request.buyerLongitude());
        order.setStationLatitude(listing.getLatitude());
        order.setStationLongitude(listing.getLongitude());

        order.setDistanceKm(Math.round(distanceKm * 100.0) / 100.0);
        order.setFuelCost(Math.round(fuelCost * 100.0) / 100.0);
        order.setDeliveryCharge(Math.round(deliveryCharge * 100.0) / 100.0);
        order.setTotalAmount(Math.round(totalAmount * 100.0) / 100.0);

        order.setPaymentMethod(request.paymentMethod());
        order.setPaymentStatus("PAID");
        order.setOrderStatus("PLACED");
        order.setCreatedAt(LocalDateTime.now());

        listing.setAvailableLitres(listing.getAvailableLitres() - request.litres());
        fuelListingRepository.save(listing);

        return ResponseEntity.ok(orderRepository.save(order));
    }

    @PutMapping("/{orderId}/assign-driver")
    public ResponseEntity<?> assignDriver(@PathVariable String orderId,
                                          @RequestBody AssignDriverRequest request) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Order not found.");
        }

        Optional<User> driverOpt = userRepository.findById(request.driverId());
        if (driverOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Driver not found.");
        }

        if (!"DRIVER".equalsIgnoreCase(driverOpt.get().getRole())) {
            return ResponseEntity.badRequest().body("Only driver accounts can be assigned.");
        }

        Order order = orderOpt.get();
        order.setDriverId(driverOpt.get().getId());
        order.setDriverName(driverOpt.get().getName());
        order.setOrderStatus("ASSIGNED_TO_DRIVER");

        return ResponseEntity.ok(orderRepository.save(order));
    }

    @PutMapping("/{orderId}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String orderId,
                                          @RequestBody StatusRequest request) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Order not found.");
        }

        Order order = orderOpt.get();
        order.setOrderStatus(request.status());
        return ResponseEntity.ok(orderRepository.save(order));
    }
}