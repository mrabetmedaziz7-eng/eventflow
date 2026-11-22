package com.iset.events.repository;

import com.iset.events.entity.User;
import com.iset.events.entity.UserRole;
import com.iset.events.entity.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    List<User> findAllByOrderByCreatedAtDesc();

    List<User> findAllByRole(com.iset.events.entity.UserRole role);

    List<User> findAllByStatusOrderByCreatedAtDesc(UserStatus status);

    long countByRoleAndStatus(UserRole role, UserStatus status);
}
