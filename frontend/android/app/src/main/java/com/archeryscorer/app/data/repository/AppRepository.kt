package com.archeryscorer.app.data.repository

import com.archeryscorer.app.data.api.RetrofitClient
import com.archeryscorer.app.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AppRepository {
    
    private val api = RetrofitClient.apiService
    
    // Sessions
    suspend fun getSessions(): Result<List<Session>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getSessions()
            if (response.isSuccessful) {
                Result.success(response.body() ?: emptyList())
            } else {
                Result.failure(Exception("Failed to fetch sessions: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getSession(id: String): Result<Session> = withContext(Dispatchers.IO) {
        try {
            val response = api.getSession(id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch session: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun createSession(request: CreateSessionRequest): Result<Session> = withContext(Dispatchers.IO) {
        try {
            val response = api.createSession(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to create session: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun updateSession(id: String, updates: Map<String, Any>): Result<Session> = withContext(Dispatchers.IO) {
        try {
            val response = api.updateSession(id, updates)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to update session: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun deleteSession(id: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = api.deleteSession(id)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete session: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun addRound(sessionId: String, request: CreateRoundRequest): Result<Session> = withContext(Dispatchers.IO) {
        try {
            val response = api.addRound(sessionId, request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to add round: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // Bows
    suspend fun getBows(): Result<List<Bow>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getBows()
            if (response.isSuccessful) {
                Result.success(response.body() ?: emptyList())
            } else {
                Result.failure(Exception("Failed to fetch bows: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun createBow(bow: Bow): Result<Bow> = withContext(Dispatchers.IO) {
        try {
            val response = api.createBow(bow)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to create bow: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun updateBow(id: String, bow: Bow): Result<Bow> = withContext(Dispatchers.IO) {
        try {
            val response = api.updateBow(id, bow)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to update bow: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun deleteBow(id: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = api.deleteBow(id)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete bow: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
