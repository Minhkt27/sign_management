package com.hospital.signage.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.signage.application.port.in.LocationUseCase;
import com.hospital.signage.application.service.UserCacheService;
import com.hospital.signage.domain.model.Location;
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

import java.util.Arrays;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LocationController.class)
@Import({ SecurityConfig.class, JwtAuthenticationFilter.class })
@WithMockUser(username = "admin", authorities = {"MAP_MANAGE"})
public class LocationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private LocationUseCase locationUseCase;

    @MockBean
    private UserCacheService userCacheService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    public void testGetAllLocations() throws Exception {
        Location loc1 = new Location();
        loc1.setId(1L);
        loc1.setName("Building A");

        Location loc2 = new Location();
        loc2.setId(2L);
        loc2.setName("Building B");

        when(locationUseCase.getAllLocations(any())).thenReturn(Arrays.asList(loc1, loc2));

        mockMvc.perform(get("/api/locations")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Building A"))
                .andExpect(jsonPath("$[1].name").value("Building B"));
    }

    @Test
    public void testGetLocationById() throws Exception {
        Location loc = new Location();
        loc.setId(1L);
        loc.setName("Building A");

        when(locationUseCase.getLocationById(1L)).thenReturn(Optional.of(loc));

        mockMvc.perform(get("/api/locations/1")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Building A"));
    }

    @Test
    public void testCreateLocation() throws Exception {
        var req = new LocationController.LocationRequest("B1-P01", "New Department", null, null, null);

        Location savedLoc = new Location();
        savedLoc.setId(3L);
        savedLoc.setName("New Department");

        when(locationUseCase.createLocation(any(Location.class))).thenReturn(savedLoc);

        mockMvc.perform(post("/api/locations")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.name").value("New Department"));
    }

    @Test
    public void testUpdateLocation() throws Exception {
        var req = new LocationController.LocationRequest("B1-P01", "Updated Department", null, null, null);

        Location updatedLoc = new Location();
        updatedLoc.setId(1L);
        updatedLoc.setName("Updated Department");

        when(locationUseCase.updateLocation(any(Long.class), any(Location.class), any())).thenReturn(updatedLoc);

        mockMvc.perform(put("/api/locations/1")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Updated Department"));
    }

    @Test
    public void testDeleteLocation() throws Exception {
        mockMvc.perform(delete("/api/locations/1")
                .with(csrf()))
                .andExpect(status().isOk());
    }
}
