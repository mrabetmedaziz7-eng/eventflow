package com.iset.events;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class FullScenarioIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Scénario complet : Inscription -> Validation -> Création événement -> Réservation -> Paiement -> Ticket -> Annulation")
    void testCompleteScenario() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String teacherEmail = "teacher." + suffix + "@example.com";
        String studentEmail = "student." + suffix + "@example.com";
        String password = "SecurePassword123!";

        // 1. Admin login
        String adminToken = login("admin@example.com", "admin12345678");
        assertThat(adminToken).isNotBlank();

        // 2. Inscription Enseignant
        String teacherRegisterJson = """
                {
                    "firstName": "Salah",
                    "lastName": "Ben Salem",
                    "email": "%s",
                    "password": "%s",
                    "role": "ENSEIGNANT"
                }
                """.formatted(teacherEmail, password);

        MvcResult teacherRegResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(teacherRegisterJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("EN_ATTENTE"))
                .andReturn();
        Long teacherId = extractId(teacherRegResult);

        // 3. Inscription Étudiant
        String studentRegisterJson = """
                {
                    "firstName": "Yassine",
                    "lastName": "Trabelsi",
                    "email": "%s",
                    "password": "%s",
                    "role": "ETUDIANT"
                }
                """.formatted(studentEmail, password);

        MvcResult studentRegResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(studentRegisterJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("EN_ATTENTE"))
                .andReturn();
        Long studentId = extractId(studentRegResult);

        // Tentative de connexion compte en attente -> doit être bloqué 403 FORBIDDEN
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "email": "%s",
                                    "password": "%s"
                                }
                                """.formatted(teacherEmail, password)))
                .andExpect(status().isForbidden());

        // 4. Admin consulte les demandes en attente
        mockMvc.perform(get("/api/admin/users/pending")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // 5. Admin valide les deux comptes via /validate
        mockMvc.perform(patch("/api/admin/users/" + teacherId + "/validate")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "role": "ENSEIGNANT"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIF"))
                .andExpect(jsonPath("$.role").value("ENSEIGNANT"));

        mockMvc.perform(patch("/api/admin/users/" + studentId + "/validate")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "role": "ETUDIANT"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIF"))
                .andExpect(jsonPath("$.role").value("ETUDIANT"));

        // 6. Connexion Enseignant
        String teacherToken = login(teacherEmail, password);
        assertThat(teacherToken).isNotBlank();

        // 7. Enseignant crée un événement via /api/teacher/events
        LocalDate futureDate = LocalDate.now().plusDays(10);
        String eventJson = """
                {
                    "title": "Conférence Intelligence Artificielle %s",
                    "description": "Séminaire sur les avancées de l'IA en 2026.",
                    "category": "TECH",
                    "eventDate": "%s",
                    "startTime": "09:00",
                    "endTime": "13:00",
                    "location": "Amphi ISET Nabeul",
                    "imageUrl": "https://example.com/event.jpg",
                    "ticketPrice": 20.00,
                    "capacity": 50
                }
                """.formatted(suffix, futureDate);

        MvcResult eventResult = mockMvc.perform(post("/api/teacher/events")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(eventJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("BROUILLON"))
                .andExpect(jsonPath("$.capacity").value(50))
                .andExpect(jsonPath("$.availablePlaces").value(50))
                .andReturn();
        Long eventId = extractId(eventResult);

        // 8. Enseignant ajoute une action au programme
        mockMvc.perform(post("/api/teacher/events/" + eventId + "/actions")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Accueil des participants",
                                    "description": "Enregistrement et badge",
                                    "actionDate": "%s",
                                    "startTime": "09:00",
                                    "endTime": "09:30"
                                }
                                """.formatted(futureDate)))
                .andExpect(status().isCreated());

        // 9. Enseignant publie l'événement via /api/teacher/events/{id}/publish
        mockMvc.perform(patch("/api/teacher/events/" + eventId + "/publish")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLIE"));

        // 10. Consultation publique du catalogue sans authentification (Public)
        mockMvc.perform(get("/api/events?search=Intelligence")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // Consultation du détail de l'événement (avec enseignant et actions)
        mockMvc.perform(get("/api/events/" + eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teacher.fullName").exists())
                .andExpect(jsonPath("$.actions").isArray())
                .andExpect(jsonPath("$.actions[0].title").value("Accueil des participants"));

        // 11. Connexion Étudiant
        String studentToken = login(studentEmail, password);
        assertThat(studentToken).isNotBlank();

        // 12. Étudiant effectue une réservation via /api/reservations
        MvcResult resResult = mockMvc.perform(post("/api/reservations")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "eventId": %d,
                                    "numberOfPlaces": 2,
                                    "paymentMethod": "CARTE_SIMULEE"
                                }
                                """.formatted(eventId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("EN_ATTENTE"))
                .andExpect(jsonPath("$.numberOfPlaces").value(2))
                .andReturn();
        Long reservationId = extractId(resResult);

        // Vérification de la diminution temporaire des places
        mockMvc.perform(get("/api/events/" + eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availablePlaces").value(48));

        // 13. Étudiant consulte ses réservations via /api/reservations/me
        mockMvc.perform(get("/api/reservations/me")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(reservationId));

        // 14. Étudiant exécute le paiement simulé via /api/reservations/{id}/pay
        mockMvc.perform(post("/api/reservations/" + reservationId + "/pay")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "status": "PAYE"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("PAYE"))
                .andExpect(jsonPath("$.reservationStatus").value("CONFIRMEE"))
                .andExpect(jsonPath("$.confirmationCode").exists());

        // 15. Étudiant consulte son ticket via /api/reservations/{id}/ticket
        mockMvc.perform(get("/api/reservations/" + reservationId + "/ticket")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventTitle").exists())
                .andExpect(jsonPath("$.location").value("Amphi ISET Nabeul"))
                .andExpect(jsonPath("$.studentName").value("Yassine Trabelsi"))
                .andExpect(jsonPath("$.amount").value(40.00))
                .andExpect(jsonPath("$.reservationCode").exists())
                .andExpect(jsonPath("$.generatedAt").exists());

        // 16. Vérification des notifications de l'étudiant et de l'enseignant
        mockMvc.perform(get("/api/notifications")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/notifications")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // 17. Enseignant consulte les participants via /api/teacher/events/{id}/participants
        mockMvc.perform(get("/api/teacher/events/" + eventId + "/participants")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].studentId").value(studentId))
                .andExpect(jsonPath("$[0].paymentStatus").value("PAYE"));

        // 18. Consultation des tableaux de bord statistiques (/api/dashboard/*)
        mockMvc.perform(get("/api/dashboard/admin")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventCount").isNumber())
                .andExpect(jsonPath("$.reservationCount").isNumber());

        mockMvc.perform(get("/api/dashboard/teacher")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publishedEventCount").isNumber());

        mockMvc.perform(get("/api/dashboard/student")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmedReservationCount").isNumber());

        // 19. Consultation de l'historique selon le rôle (/api/history)
        mockMvc.perform(get("/api/history")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/history")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/history")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk());

        // 20. Annulation de la réservation par l'étudiant via /api/reservations/{id}/cancel
        mockMvc.perform(post("/api/reservations/" + reservationId + "/cancel")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ANNULEE"));

        // Vérification que les 2 places ont bien été restituées (retour à 50)
        mockMvc.perform(get("/api/events/" + eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availablePlaces").value(50));
    }

    private String login(String email, String password) throws Exception {
        String loginJson = """
                {
                    "email": "%s",
                    "password": "%s"
                }
                """.formatted(email, password);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.has("accessToken") ? node.get("accessToken").asText() : node.get("token").asText();
    }

    private Long extractId(MvcResult result) throws Exception {
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.get("id").asLong();
    }
}
