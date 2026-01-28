package com.archeryscorer.app.data.api

import com.archeryscorer.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    // Sessions
    @GET("api/sessions")
    suspend fun getSessions(): Response<List<Session>>
    
    @GET("api/sessions/{id}")
    suspend fun getSession(@Path("id") id: String): Response<Session>
    
    @POST("api/sessions")
    suspend fun createSession(@Body request: CreateSessionRequest): Response<Session>
    
    @PUT("api/sessions/{id}")
    suspend fun updateSession(
        @Path("id") id: String,
        @Body updates: Map<String, Any>
    ): Response<Session>
    
    @DELETE("api/sessions/{id}")
    suspend fun deleteSession(@Path("id") id: String): Response<Unit>
    
    // Rounds
    @POST("api/sessions/{sessionId}/rounds")
    suspend fun addRound(
        @Path("sessionId") sessionId: String,
        @Body request: CreateRoundRequest
    ): Response<Session>
    
    // Bows
    @GET("api/bows")
    suspend fun getBows(): Response<List<Bow>>
    
    @POST("api/bows")
    suspend fun createBow(@Body bow: Bow): Response<Bow>
    
    @PUT("api/bows/{id}")
    suspend fun updateBow(
        @Path("id") id: String,
        @Body bow: Bow
    ): Response<Bow>
    
    @DELETE("api/bows/{id}")
    suspend fun deleteBow(@Path("id") id: String): Response<Unit>
}
