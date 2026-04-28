package com.ecommerce.controller;

import com.ecommerce.dto.LoginRequestDTO;
import com.ecommerce.dto.LoginResponseDTO;
import com.ecommerce.dto.RegisterRequestDTO;
import com.ecommerce.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public Result<LoginResponseDTO> login(@RequestBody LoginRequestDTO request) {
        try {
            LoginResponseDTO response = userService.loginUser(request);
            return Result.success(response);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }

    @PostMapping("/register")
    public Result<Void> register(@RequestBody RegisterRequestDTO request) {
        try {
            userService.registerUser(request);
            return Result.success(null);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }
}
