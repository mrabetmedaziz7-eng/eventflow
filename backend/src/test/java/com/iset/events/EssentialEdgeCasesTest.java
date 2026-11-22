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

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class EssentialEdgeCasesTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Cas 1: E-mail déjà existant est refusé")
    void testDuplicateEmailRejected() throws Exception {
        String email = "duplicate." + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        String registerJson = """
                {
                    "firstName": "Ali",
                    "lastName": "Gharbi",
                    "email": "%s",
                    "password": "Password123!",
                    "role": "ETUDIANT"
                }
                """.formatted(email);

        // Premier enregistrement -> OK (201)
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson))
                .andExpect(status().isCreated());

        // Deuxième enregistrement avec le même email -> CONFLICT 409
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"))
                .andExpect(jsonPath("$.path").value("/api/auth/register"));
    }

    @Test
    @DisplayName("Cas 2: Compte non validé ne peut pas se connecter")
    void testPendingAccountCannotLogin() throws Exception {
        String email = "pending." + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "firstName": "Sami",
                                    "lastName": "Kefi",
                                    "email": "%s",
                                    "password": "Password123!",
                                    "role": "ETUDIANT"
                                }
                                """.formatted(email)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "email": "%s",
                                    "password": "Password123!"
                                }
                                """.formatted(email)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_NOT_ACTIVE"));
    }

    @Test
    @DisplayName("Cas 3: Enseignant ne peut pas modifier l'événement d'un autre enseignant")
    void testTeacherCannotModifyAnotherTeachersEvent() throws Exception {
        String adminToken = login("admin@example.com", "admin12345678");

        String teacher1 = createAndValidateUser(adminToken, "ENSEIGNANT");
        String teacher2 = createAndValidateUser(adminToken, "ENSEIGNANT");

        String teacher1Token = login(teacher1, "Password123!");
        String teacher2Token = login(teacher2, "Password123!");

        // Teacher 1 creates event
        LocalDate date = LocalDate.now().plusDays(15);
        MvcResult eventRes = mockMvc.perform(post("/api/teacher/events")
                        .header("Authorization", "Bearer " + teacher1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Atelier IoT",
                                    "description": "Pratique Arduino et ESP32",
                                    "category": "TECH",
                                    "eventDate": "%s",
                                    "startTime": "10:00",
                                    "endTime": "12:00",
                                    "location": "Lab 3",
                                    "imageUrl": "https://example.com/iot.jpg",
                                    "ticketPrice": 0.00,
                                    "capacity": 20
                                }
                                """.formatted(date)))
                .andExpect(status().isCreated())
                .andReturn();
        Long eventId = extractId(eventRes);

        // Teacher 2 tries to update Teacher 1's event -> 404 NOT FOUND (resource not accessible to them)
        mockMvc.perform(put("/api/teacher/events/" + eventId)
                        .header("Authorization", "Bearer " + teacher2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Piratage de l'atelier",
                                    "description": "Modification non autorisée",
                                    "category": "TECH",
                                    "eventDate": "%s",
                                    "startTime": "10:00",
                                    "endTime": "12:00",
                                    "location": "Lab 3",
                                    "imageUrl": "https://example.com/iot.jpg",
                                    "ticketPrice": 0.00,
                                    "capacity": 20
                                }
                                """.formatted(date)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @DisplayName("Cas 4: Étudiant ne peut pas réserver deux fois le même événement")
    void testDoubleReservationPrevented() throws Exception {
        String adminToken = login("admin@example.com", "admin12345678");
        String teacher = createAndValidateUser(adminToken, "ENSEIGNANT");
        String student = createAndValidateUser(adminToken, "ETUDIANT");

        String teacherToken = login(teacher, "Password123!");
        String studentToken = login(student, "Password123!");

        // Create and publish event
        LocalDate date = LocalDate.now().plusDays(20);
        MvcResult eventRes = mockMvc.perform(post("/api/teacher/events")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Visite Entreprise",
                                    "description": "Visite guidée",
                                    "category": "VISITE",
                                    "eventDate": "%s",
                                    "startTime": "08:00",
                                    "endTime": "12:00",
                                    "location": "Technopole",
                                    "imageUrl": "https://example.com/visit.jpg",
                                    "ticketPrice": 10.00,
                                    "capacity": 15
                                }
                                """.formatted(date)))
                .andExpect(status().isCreated())
                .andReturn();
        Long eventId = extractId(eventRes);

        mockMvc.perform(patch("/api/teacher/events/" + eventId + "/publish")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk());

        // First reservation -> OK
        mockMvc.perform(post("/api/reservations")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "eventId": %d,
                                    "numberOfPlaces": 1,
                                    "paymentMethod": "CARTE_SIMULEE"
                                }
                                """.formatted(eventId)))
                .andExpect(status().isCreated());

        // Second reservation by same student -> CONFLICT 409
        mockMvc.perform(post("/api/reservations")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "eventId": %d,
                                    "numberOfPlaces": 1,
                                    "paymentMethod": "CARTE_SIMULEE"
                                }
                                """.formatted(eventId)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESERVATION_CONFLICT"));
    }

    @Test
    @DisplayName("Cas 5: Événement complet refuse les nouvelles réservations")
    void testFullEventRejectsNewReservations() throws Exception {
        String adminToken = login("admin@example.com", "admin12345678");
        String teacher = createAndValidateUser(adminToken, "ENSEIGNANT");
        String student1 = createAndValidateUser(adminToken, "ETUDIANT");
        String student2 = createAndValidateUser(adminToken, "ETUDIANT");

        String teacherToken = login(teacher, "Password123!");
        String s1Token = login(student1, "Password123!");
        String s2Token = login(student2, "Password123!");

        // Create and publish event with capacity = 1
        LocalDate date = LocalDate.now().plusDays(25);
        MvcResult eventRes = mockMvc.perform(post("/api/teacher/events")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Séminaire Limité 1 Place",
                                    "description": "Capacité unique",
                                    "category": "TECH",
                                    "eventDate": "%s",
                                    "startTime": "14:00",
                                    "endTime": "16:00",
                                    "location": "Salle A",
                                    "imageUrl": "https://example.com/one.jpg",
                                    "ticketPrice": 0.00,
                                    "capacity": 1
                                }
                                """.formatted(date)))
                .andExpect(status().isCreated())
                .andReturn();
        Long eventId = extractId(eventRes);

        mockMvc.perform(patch("/api/teacher/events/" + eventId + "/publish")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk());

        // Student 1 books the only place
        mockMvc.perform(post("/api/reservations")
                        .header("Authorization", "Bearer " + s1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "eventId": %d,
                                    "numberOfPlaces": 1
                                }
                                """.formatted(eventId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CONFIRMEE"));

        // Verify event is now COMPLET
        mockMvc.perform(get("/api/events/" + eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLET"))
                .andExpect(jsonPath("$.availablePlaces").value(0));

        // Student 2 tries to reserve -> CONFLICT (INSUFFICIENT_CAPACITY)
        mockMvc.perform(post("/api/reservations")
                        .header("Authorization", "Bearer " + s2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "eventId": %d,
                                    "numberOfPlaces": 1
                                }
                                """.formatted(eventId)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_CAPACITY"));
    }

    @Test
    @DisplayName("Cas 6: Paiement échoué annule la réservation et libère les places")
    void testFailedPaymentCancelsReservationAndFreesPlaces() throws Exception {
        String adminToken = login("admin@example.com", "admin12345678");
        String teacher = createAndValidateUser(adminToken, "ENSEIGNANT");
        String student = createAndValidateUser(adminToken, "ETUDIANT");

        String teacherToken = login(teacher, "Password123!");
        String studentToken = login(student, "Password123!");

        LocalDate date = LocalDate.now().plusDays(30);
        MvcResult eventRes = mockMvc.perform(post("/api/teacher/events")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Excursion Découverte",
                                    "description": "Excursion payante",
                                    "category": "SORTIE",
                                    "eventDate": "%s",
                                    "startTime": "07:00",
                                    "endTime": "18:00",
                                    "location": "Zaghouan",
                                    "imageUrl": "https://example.com/trip.jpg",
                                    "ticketPrice": 35.00,
                                    "capacity": 10
                                }
                                """.formatted(date)))
                .andExpect(status().isCreated())
                .andReturn();
        Long eventId = extractId(eventRes);

        mockMvc.perform(patch("/api/teacher/events/" + eventId + "/publish")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk());

        // Book 3 places -> available becomes 7
        MvcResult resResult = mockMvc.perform(post("/api/reservations")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "eventId": %d,
                                    "numberOfPlaces": 3,
                                    "paymentMethod": "CARTE_SIMULEE"
                                }
                                """.formatted(eventId)))
                .andExpect(status().isCreated())
                .andReturn();
        Long reservationId = extractId(resResult);

        mockMvc.perform(get("/api/events/" + eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availablePlaces").value(7));

        // Simulate payment failure (status = ECHOUE)
        mockMvc.perform(post("/api/reservations/" + reservationId + "/pay")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "status": "ECHOUE"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("ECHOUE"))
                .andExpect(jsonPath("$.reservationStatus").value("ANNULEE"));

        // Verify places are automatically released back to 10
        mockMvc.perform(get("/api/events/" + eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availablePlaces").value(10));
    }

    @Test
    @DisplayName("Cas 7: Gestion des textes accentués et arabes")
    void testAccentedAndArabicTextStoredAndReturned() throws Exception {
        String adminToken = login("admin@example.com", "admin12345678");
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String teacherEmail = "prof.arabe." + suffix + "@example.com";

        MvcResult reg = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .characterEncoding("UTF-8")
                        .content("""
                                {
                                    "firstName": "محمد",
                                    "lastName": "Éléonore-Bénédicte",
                                    "email": "%s",
                                    "password": "Password123!",
                                    "role": "ENSEIGNANT"
                                }
                                """.formatted(teacherEmail)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.firstName").value("محمد"))
                .andExpect(jsonPath("$.lastName").value("Éléonore-Bénédicte"))
                .andReturn();
        Long teacherId = extractId(reg);

        mockMvc.perform(patch("/api/admin/users/" + teacherId + "/validate")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ENSEIGNANT\"}"))
                .andExpect(status().isOk());

        String teacherToken = login(teacherEmail, "Password123!");
        LocalDate date = LocalDate.now().plusDays(14);
        MvcResult eventRes = mockMvc.perform(post("/api/teacher/events")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .characterEncoding("UTF-8")
                        .content("""
                                {
                                    "title": "مؤتمر الذكاء الاصطناعي و Événement ISET",
                                    "description": "تطبيقات الذكاء الاصطناعي والروبوتات avancées",
                                    "category": "TECH",
                                    "eventDate": "%s",
                                    "startTime": "09:00",
                                    "endTime": "13:00",
                                    "location": "قاعة المؤتمرات - Amphithéâtre",
                                    "imageUrl": "https://example.com/arabic.jpg",
                                    "ticketPrice": 0.00,
                                    "capacity": 30
                                }
                                """.formatted(date)))
                .andExpect(status().isCreated())
                .andReturn();
        Long eventId = extractId(eventRes);

        mockMvc.perform(patch("/api/teacher/events/" + eventId + "/publish")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/events/" + eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("مؤتمر الذكاء الاصطناعي و Événement ISET"))
                .andExpect(jsonPath("$.description").value("تطبيقات الذكاء الاصطناعي والروبوتات avancées"))
                .andExpect(jsonPath("$.location").value("قاعة المؤتمرات - Amphithéâtre"))
                .andExpect(jsonPath("$.teacher.fullName").value("محمد Éléonore-Bénédicte"));
    }

    @Test
    @DisplayName("Cas 8: Deux réservations simultanées pour la dernière place - une seule réussit")
    void testSimultaneousBookingsForLastPlace() throws Exception {
        String adminToken = login("admin@example.com", "admin12345678");
        String teacher = createAndValidateUser(adminToken, "ENSEIGNANT");
        String student1 = createAndValidateUser(adminToken, "ETUDIANT");
        String student2 = createAndValidateUser(adminToken, "ETUDIANT");

        String teacherToken = login(teacher, "Password123!");
        String s1Token = login(student1, "Password123!");
        String s2Token = login(student2, "Password123!");

        LocalDate date = LocalDate.now().plusDays(18);
        MvcResult eventRes = mockMvc.perform(post("/api/teacher/events")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Hackathon 1 Place Restante",
                                    "description": "Compétition sélective",
                                    "category": "TECH",
                                    "eventDate": "%s",
                                    "startTime": "09:00",
                                    "endTime": "18:00",
                                    "location": "Lab",
                                    "imageUrl": "https://example.com/hack.jpg",
                                    "ticketPrice": 0.00,
                                    "capacity": 1
                                }
                                """.formatted(date)))
                .andExpect(status().isCreated())
                .andReturn();
        Long eventId = extractId(eventRes);

        mockMvc.perform(patch("/api/teacher/events/" + eventId + "/publish")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk());

        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        String[] tokens = new String[]{s1Token, s2Token};

        for (String token : tokens) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    MvcResult res = mockMvc.perform(post("/api/reservations")
                                    .header("Authorization", "Bearer " + token)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"eventId\": " + eventId + ", \"numberOfPlaces\": 1}"))
                            .andReturn();
                    int code = res.getResponse().getStatus();
                    if (code == 201) {
                        successCount.incrementAndGet();
                    } else if (code == 409) {
                        conflictCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });
        }

        readyLatch.await();
        startLatch.countDown();
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(conflictCount.get()).isEqualTo(1);

        mockMvc.perform(get("/api/events/" + eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availablePlaces").value(0))
                .andExpect(jsonPath("$.status").value("COMPLET"));
    }

    @Test
    @DisplayName("Cas 9: Réorganisation et suppression des actions avec vérification des timestamps")
    void testActionReorderAndDelete() throws Exception {
        String adminToken = login("admin@example.com", "admin12345678");
        String teacher = createAndValidateUser(adminToken, "ENSEIGNANT");
        String teacherToken = login(teacher, "Password123!");

        LocalDate date = LocalDate.now().plusDays(12);
        MvcResult eventRes = mockMvc.perform(post("/api/teacher/events")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Journée Portes Ouvertes",
                                    "description": "Présentation des filières",
                                    "category": "FORUM",
                                    "eventDate": "%s",
                                    "startTime": "08:30",
                                    "endTime": "16:00",
                                    "location": "Hall Principal",
                                    "imageUrl": "https://example.com/jpo.jpg",
                                    "ticketPrice": 0.00,
                                    "capacity": 100
                                }
                                """.formatted(date)))
                .andExpect(status().isCreated())
                .andReturn();
        Long eventId = extractId(eventRes);

        // Add Action 1
        MvcResult a1Res = mockMvc.perform(post("/api/teacher/events/" + eventId + "/actions")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Accueil",
                                    "description": "Enregistrement",
                                    "actionDate": "%s",
                                    "startTime": "08:30",
                                    "endTime": "09:00"
                                }
                                """.formatted(date)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.startTime").value("08:30:00"))
                .andReturn();
        Long a1Id = extractId(a1Res);

        // Add Action 2
        MvcResult a2Res = mockMvc.perform(post("/api/teacher/events/" + eventId + "/actions")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Discours d'ouverture",
                                    "description": "Mot de bienvenue",
                                    "actionDate": "%s",
                                    "startTime": "09:00",
                                    "endTime": "10:00"
                                }
                                """.formatted(date)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.startTime").value("09:00:00"))
                .andReturn();
        Long a2Id = extractId(a2Res);

        // Reorder actions: put Action 2 first, Action 1 second
        mockMvc.perform(patch("/api/teacher/events/" + eventId + "/actions/order")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "actionIds": [%d, %d]
                                }
                                """.formatted(a2Id, a1Id)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(a2Id))
                .andExpect(jsonPath("$[0].displayOrder").value(0))
                .andExpect(jsonPath("$[1].id").value(a1Id))
                .andExpect(jsonPath("$[1].displayOrder").value(1));

        // Delete Action 1
        mockMvc.perform(delete("/api/teacher/events/" + eventId + "/actions/" + a1Id)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isNoContent());

        // Verify remaining action
        mockMvc.perform(get("/api/teacher/events/" + eventId + "/actions")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(a2Id))
                .andExpect(jsonPath("$[0].title").value("Discours d'ouverture"));
    }

    private String createAndValidateUser(String adminToken, String role) throws Exception {
        String email = role.toLowerCase() + "." + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        MvcResult reg = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "firstName": "Test",
                                    "lastName": "User",
                                    "email": "%s",
                                    "password": "Password123!",
                                    "role": "%s"
                                }
                                """.formatted(email, role)))
                .andExpect(status().isCreated())
                .andReturn();
        Long id = extractId(reg);

        mockMvc.perform(patch("/api/admin/users/" + id + "/validate")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "role": "%s"
                                }
                                """.formatted(role)))
                .andExpect(status().isOk());

        return email;
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "email": "%s",
                                    "password": "%s"
                                }
                                """.formatted(email, password)))
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
