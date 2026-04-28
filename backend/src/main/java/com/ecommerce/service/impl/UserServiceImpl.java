package com.ecommerce.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.ecommerce.dto.LoginRequestDTO;
import com.ecommerce.dto.LoginResponseDTO;
import com.ecommerce.dto.RegisterRequestDTO;
import com.ecommerce.entity.User;
import com.ecommerce.mapper.UserMapper;
import com.ecommerce.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserMapper userMapper;

    @Override
    public LoginResponseDTO loginUser(LoginRequestDTO request) {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.eq("username", request.getUsername());
        User user = userMapper.selectOne(wrapper);

        if (user == null || !user.getPassword().equals(request.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }

        LoginResponseDTO response = new LoginResponseDTO();
        response.setUserId(user.getId());
        response.setUsername(user.getUsername());
        response.setToken(UUID.randomUUID().toString());
        return response;
    }

    @Override
    public void registerUser(RegisterRequestDTO request) {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.eq("username", request.getUsername());
        if (userMapper.selectOne(wrapper) != null) {
            throw new RuntimeException("用户名已存在");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(request.getPassword());
        user.setPhone(request.getPhone());
        user.setCreateTime(LocalDateTime.now());
        userMapper.insert(user);
    }
}
