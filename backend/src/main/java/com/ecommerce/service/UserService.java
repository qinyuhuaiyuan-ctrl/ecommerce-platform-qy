package com.ecommerce.service;

import com.ecommerce.dto.LoginRequestDTO;
import com.ecommerce.dto.LoginResponseDTO;
import com.ecommerce.dto.RegisterRequestDTO;

public interface UserService {
    LoginResponseDTO loginUser(LoginRequestDTO request);
    void registerUser(RegisterRequestDTO request);
}
