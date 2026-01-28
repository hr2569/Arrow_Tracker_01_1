package com.archeryscorer.app.data.model

import com.google.gson.annotations.SerializedName

data class Bow(
    val id: String = "",
    val name: String = "",
    val type: String = "recurve",
    val notes: String = "",
    @SerializedName("created_at")
    val createdAt: String = ""
)

data class Shot(
    val x: Float = 0.5f,
    val y: Float = 0.5f,
    val ring: Int = 0
)

data class Round(
    val id: String = "",
    @SerializedName("round_number")
    val roundNumber: Int = 1,
    val shots: List<Shot> = emptyList(),
    @SerializedName("total_score")
    val totalScore: Int = 0
)

data class Session(
    val id: String = "",
    val name: String = "",
    @SerializedName("session_type")
    val sessionType: String = "training",
    val rounds: List<Round> = emptyList(),
    @SerializedName("total_score")
    val totalScore: Int = 0,
    @SerializedName("created_at")
    val createdAt: String = "",
    @SerializedName("bow_name")
    val bowName: String? = null,
    @SerializedName("bow_id")
    val bowId: String? = null,
    val distance: String? = null,
    @SerializedName("target_type")
    val targetType: String = "wa_standard"
)

data class CreateSessionRequest(
    val name: String,
    @SerializedName("session_type")
    val sessionType: String = "training",
    @SerializedName("bow_id")
    val bowId: String? = null,
    @SerializedName("bow_name")
    val bowName: String? = null,
    val distance: String? = null,
    @SerializedName("target_type")
    val targetType: String = "wa_standard"
)

data class CreateRoundRequest(
    val shots: List<Shot>,
    @SerializedName("total_score")
    val totalScore: Int
)

enum class TargetType(val displayName: String) {
    WA_STANDARD("WA Standard"),
    VEGAS_3SPOT("Vegas 3-Spot"),
    NFAA_INDOOR("NFAA Indoor");
    
    companion object {
        fun fromString(value: String): TargetType {
            return when(value) {
                "vegas_3spot" -> VEGAS_3SPOT
                "nfaa_indoor" -> NFAA_INDOOR
                else -> WA_STANDARD
            }
        }
    }
    
    fun toApiString(): String {
        return when(this) {
            WA_STANDARD -> "wa_standard"
            VEGAS_3SPOT -> "vegas_3spot"
            NFAA_INDOOR -> "nfaa_indoor"
        }
    }
}

enum class BowType(val displayName: String) {
    RECURVE("Recurve"),
    COMPOUND("Compound"),
    LONGBOW("Longbow"),
    BAREBOW("Barebow");
    
    companion object {
        fun fromString(value: String): BowType {
            return entries.find { it.name.lowercase() == value.lowercase() } ?: RECURVE
        }
    }
}
