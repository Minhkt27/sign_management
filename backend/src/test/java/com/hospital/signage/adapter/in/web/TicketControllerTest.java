package com.hospital.signage.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.signage.application.port.in.TicketUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.enums.Priority;
import com.hospital.signage.domain.enums.TicketStatus;
import com.hospital.signage.domain.model.MaintenanceTicket;
import com.hospital.signage.infrastructure.security.JwtAuthenticationFilter;
import com.hospital.signage.infrastructure.security.JwtTokenProvider;
import com.hospital.signage.infrastructure.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.data.domain.PageImpl;

import java.util.Arrays;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TicketController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@WithMockUser(username = "admin", roles = {"ADMIN"})
public class TicketControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TicketUseCase ticketUseCase;

    @MockBean
    private UserDatabasePort userDatabasePort;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    public void testGetAllTickets() throws Exception {
        MaintenanceTicket ticket1 = new MaintenanceTicket();
        ticket1.setId(1L);
        ticket1.setDescription("Broken light");
        ticket1.setPriority(Priority.HIGH);
        ticket1.setTicketStatus(TicketStatus.OPEN);

        MaintenanceTicket ticket2 = new MaintenanceTicket();
        ticket2.setId(2L);
        ticket2.setDescription("Loose frame");
        ticket2.setPriority(Priority.LOW);
        ticket2.setTicketStatus(TicketStatus.IN_PROGRESS);

        when(ticketUseCase.getTicketsPage(0, 10, null, null))
                .thenReturn(new PageImpl<>(Arrays.asList(ticket1, ticket2)));

        mockMvc.perform(get("/api/tickets")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].description").value("Broken light"))
                .andExpect(jsonPath("$.content[1].description").value("Loose frame"));
    }

    @Test
    public void testGetTicketById() throws Exception {
        MaintenanceTicket ticket = new MaintenanceTicket();
        ticket.setId(1L);
        ticket.setDescription("Broken light");

        when(ticketUseCase.getTicketById(1L)).thenReturn(Optional.of(ticket));

        mockMvc.perform(get("/api/tickets/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Broken light"));
    }

    @Test
    public void testGetTicketByIdNotFound() throws Exception {
        when(ticketUseCase.getTicketById(1L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/tickets/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testAssignTicket() throws Exception {
        MaintenanceTicket ticket = new MaintenanceTicket();
        ticket.setId(1L);
        ticket.setTicketStatus(TicketStatus.IN_PROGRESS);

        when(ticketUseCase.assignTicket(eq(1L), eq(2L))).thenReturn(ticket);

        TicketController.AssignTicketRequest request = new TicketController.AssignTicketRequest(2L);

        mockMvc.perform(put("/api/tickets/1/assign")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticketStatus").value("IN_PROGRESS"));
    }

    @Test
    public void testUpdateTicketStatus() throws Exception {
        MaintenanceTicket ticket = new MaintenanceTicket();
        ticket.setId(1L);
        ticket.setTicketStatus(TicketStatus.RESOLVED);

        when(ticketUseCase.updateTicketStatus(eq(1L), eq(TicketStatus.RESOLVED), eq("before.jpg"), eq("after.jpg"), eq(null), eq(null)))
                .thenReturn(ticket);

        TicketController.UpdateStatusRequest request = new TicketController.UpdateStatusRequest(
                TicketStatus.RESOLVED, "before.jpg", "after.jpg", null
        );

        mockMvc.perform(put("/api/tickets/1/status")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticketStatus").value("RESOLVED"));
    }
}
