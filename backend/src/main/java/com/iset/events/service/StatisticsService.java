package com.iset.events.service;

import com.iset.events.dto.statistics.AdminStatisticsResponse;
import com.iset.events.dto.statistics.StudentEventSummary;
import com.iset.events.dto.statistics.StudentStatisticsResponse;
import com.iset.events.dto.statistics.TeacherEventStatistics;
import com.iset.events.dto.statistics.TeacherStatisticsResponse;
import com.iset.events.entity.UserRole;
import com.iset.events.entity.UserStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class StatisticsService {

    private final JdbcTemplate jdbcTemplate;

    public StatisticsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public AdminStatisticsResponse admin() {
        Map<String, Long> usersByRole = countsBy("role", "users", UserRole.values());
        Map<String, Long> usersByStatus = countsBy("status", "users", UserStatus.values());
        long events = count("SELECT COUNT(*) FROM events");
        long reservations = count("SELECT COUNT(*) FROM reservations");
        BigDecimal revenue = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(amount), 0.00) FROM payments WHERE status = 'PAYE'",
                BigDecimal.class
        );
        return new AdminStatisticsResponse(usersByRole, usersByStatus, events, reservations, revenue);
    }

    @Transactional(readOnly = true)
    public TeacherStatisticsResponse teacher(Long teacherId) {
        List<TeacherEventStatistics> events = jdbcTemplate.query(
                """
                SELECT e.id, e.title, e.event_date, e.status, e.capacity,
                       COALESCE(SUM(r.number_of_places) FILTER (WHERE r.status = 'CONFIRMEE'), 0) AS places_sold,
                       COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'PAYE'), 0.00) AS revenue
                FROM events e
                LEFT JOIN reservations r ON r.event_id = e.id
                LEFT JOIN payments p ON p.reservation_id = r.id
                WHERE e.teacher_id = ? AND e.status IN ('PUBLIE', 'COMPLET')
                GROUP BY e.id
                ORDER BY e.event_date, e.id
                """,
                (resultSet, rowNumber) -> {
                    int capacity = resultSet.getInt("capacity");
                    int sold = resultSet.getInt("places_sold");
                    return new TeacherEventStatistics(
                            resultSet.getLong("id"),
                            resultSet.getString("title"),
                            resultSet.getObject("event_date", LocalDate.class),
                            resultSet.getString("status"),
                            capacity,
                            sold,
                            percentage(sold, capacity),
                            resultSet.getBigDecimal("revenue")
                    );
                },
                teacherId
        );
        long sold = events.stream().mapToLong(TeacherEventStatistics::placesSold).sum();
        long capacity = events.stream().mapToLong(TeacherEventStatistics::capacity).sum();
        BigDecimal revenue = events.stream().map(TeacherEventStatistics::revenue).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new TeacherStatisticsResponse(events.size(), sold, percentage(sold, capacity), revenue, events);
    }

    @Transactional(readOnly = true)
    public StudentStatisticsResponse student(Long studentId) {
        long confirmedReservations = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reservations WHERE student_id = ? AND status = 'CONFIRMEE'",
                Long.class,
                studentId
        );
        long payments = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM payments p JOIN reservations r ON r.id = p.reservation_id WHERE r.student_id = ?",
                Long.class,
                studentId
        );
        BigDecimal paidAmount = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(p.amount), 0.00) FROM payments p JOIN reservations r ON r.id = p.reservation_id WHERE r.student_id = ? AND p.status = 'PAYE'",
                BigDecimal.class,
                studentId
        );
        List<StudentEventSummary> upcoming = studentEvents(studentId, true);
        List<StudentEventSummary> past = studentEvents(studentId, false);
        return new StudentStatisticsResponse(confirmedReservations, payments, paidAmount, upcoming, past);
    }

    private List<StudentEventSummary> studentEvents(Long studentId, boolean upcoming) {
        String dateOperator = upcoming ? ">=" : "<";
        return jdbcTemplate.query(
                """
                SELECT r.id AS reservation_id, e.id AS event_id, e.title, e.event_date, e.location,
                       r.number_of_places, r.status AS reservation_status, r.confirmation_code,
                       p.status AS payment_status, COALESCE(p.amount, 0.00) AS amount
                FROM reservations r
                JOIN events e ON e.id = r.event_id
                LEFT JOIN payments p ON p.reservation_id = r.id
                WHERE r.student_id = ? AND r.status = 'CONFIRMEE' AND e.event_date """ + dateOperator + " CURRENT_DATE " +
                        (upcoming ? "ORDER BY e.event_date, r.id" : "ORDER BY e.event_date DESC, r.id"),
                (resultSet, rowNumber) -> new StudentEventSummary(
                        resultSet.getLong("reservation_id"),
                        resultSet.getLong("event_id"),
                        resultSet.getString("title"),
                        resultSet.getObject("event_date", LocalDate.class),
                        resultSet.getString("location"),
                        resultSet.getInt("number_of_places"),
                        resultSet.getString("reservation_status"),
                        resultSet.getString("confirmation_code"),
                        resultSet.getString("payment_status"),
                        resultSet.getBigDecimal("amount")
                ),
                studentId
        );
    }

    private long count(String sql) {
        Long result = jdbcTemplate.queryForObject(sql, Long.class);
        return result == null ? 0 : result;
    }

    private <E extends Enum<E>> Map<String, Long> countsBy(String column, String table, E[] values) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (E value : values) {
            counts.put(value.name(), 0L);
        }
        jdbcTemplate.query(
                "SELECT " + column + " AS item, COUNT(*) AS total FROM " + table + " GROUP BY " + column,
                (RowCallbackHandler) resultSet -> counts.put(resultSet.getString("item"), resultSet.getLong("total"))
        );
        return counts;
    }

    private BigDecimal percentage(long numerator, long denominator) {
        if (denominator == 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(numerator).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
    }
}
