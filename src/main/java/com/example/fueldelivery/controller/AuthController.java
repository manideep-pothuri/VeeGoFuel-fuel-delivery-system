package com.example.fueldelivery.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.fueldelivery.dto.AuthRequest;
import com.example.fueldelivery.model.User;
import com.example.fueldelivery.repository.UserRepository;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        if (request.email() == null || request.password() == null || request.role() == null) {
            return ResponseEntity.badRequest().body("Email, password and role are required.");
        }

        String role = request.role().toUpperCase();
        if (!role.equals("BUYER") && !role.equals("SELLER") && !role.equals("DRIVER")) {
            return ResponseEntity.badRequest().body("Role must be BUYER, SELLER or DRIVER.");
        }

        Optional<User> existing = userRepository.findByEmail(request.email());
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body("User already exists with this email.");
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPassword(request.password());
        user.setRole(role);
        user.setPhone(request.phone());
        user.setCreatedAt(LocalDateTime.now());

        User saved = userRepository.save(user);
        return ResponseEntity.ok(publicUser(saved));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        Optional<User> user = userRepository.findByEmailAndPassword(request.email(), request.password());
        if (user.isEmpty()) {
            return ResponseEntity.badRequest().body("Invalid email or password.");
        }
        return ResponseEntity.ok(publicUser(user.get()));
    }

    private Map<String, Object> publicUser(User user) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", user.getId());
        result.put("name", user.getName());
        result.put("email", user.getEmail());
        result.put("role", user.getRole());
        result.put("phone", user.getPhone());
        return result;
    }
}