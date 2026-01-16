// Example HoloScript world definitions for Phase 0 templates

// ============================================================================
// ZONE: Welcome Plaza - Introduction space
// ============================================================================
ZONE welcome_plaza {
  position: (0, 0, 0)
  
  ENTITY info_pillar {
    position: (0, 0, 0)
    model: "assets/pillar.glb"
    color: #4488FF
    
    ON_CLICK {
      PLAY_SOUND("info_click.mp3")
    }
  }
  
  ENTITY welcome_sign {
    position: (0, 3, -5)
    model: "assets/holographic_sign.glb"
    
    ANIMATE {
      property: "rotation.y"
      from: 0
      to: 360
      duration: 8s
      loop: true
    }
  }
  
  ENTITY portal_casino {
    position: (-6, 2, -6)
    model: "assets/portal.glb"
    color: #FF00FF
    
    ON_CLICK {
      NAVIGATE("zones/casino")
    }
  }
  
  ENTITY portal_builder_shop {
    position: (6, 2, -6)
    model: "assets/portal.glb"
    color: #4488FF
    
    ON_CLICK {
      NAVIGATE("zones/builder_shop")
    }
  }
}

// ============================================================================
// ZONE: Casino - Gambling games and VIP lounge
// ============================================================================
ZONE casino {
  position: (20, 0, 0)
  
  ENTITY slot_machine_1 {
    position: (-8, 0, -8)
    model: "assets/slot_machine.glb"
    
    ON_CLICK {
      PLAY_SOUND("slot_spin.mp3")
      EMIT_EVENT("slot_spin", { machine: 1 })
    }
  }
  
  ENTITY slot_machine_2 {
    position: (0, 0, -8)
    model: "assets/slot_machine.glb"
    
    ON_CLICK {
      PLAY_SOUND("slot_spin.mp3")
      EMIT_EVENT("slot_spin", { machine: 2 })
    }
  }
  
  ENTITY poker_table {
    position: (0, 1, 0)
    model: "assets/poker_table.glb"
    
    ON_HOVER {
      SHOW_MESSAGE("Join a poker game", duration: 2s)
    }
  }
  
  ENTITY vip_door {
    position: (12, 2, -12)
    model: "assets/vip_door.glb"
    color: #FFFF00
    
    ON_CLICK {
      SHOW_DIALOG("VIP Access Required", { 
        message: "You need a VIP pass",
        buttons: ["Buy Pass", "Cancel"]
      })
    }
  }
  
  ENTITY leaderboard {
    position: (-12, 3, -12)
    model: "assets/leaderboard_display.glb"
    
    ON_CLICK {
      NAVIGATE("ui/leaderboard")
    }
  }
}

// ============================================================================
// ZONE: Builder Shop - Asset marketplace
// ============================================================================
ZONE builder_shop {
  position: (-20, 0, 0)
  
  ENTITY shop_counter {
    position: (0, 1, -2)
    model: "assets/counter.glb"
    
    ON_CLICK {
      NAVIGATE("shop/marketplace")
    }
  }
  
  ENTITY model_vending_machine {
    position: (-10, 2, -10)
    model: "assets/vending_machine.glb"
    color: #4488FF
    
    ON_CLICK {
      SHOW_STORE("models")
    }
  }
  
  ENTITY texture_vending_machine {
    position: (-10, 2, 0)
    model: "assets/vending_machine.glb"
    color: #FF8844
    
    ON_CLICK {
      SHOW_STORE("textures")
    }
  }
  
  ENTITY creator_booth_1 {
    position: (10, 2, -10)
    model: "assets/booth.glb"
    
    ON_HOVER {
      SHOW_MESSAGE("VoxelWizard's Studio")
    }
    
    ON_CLICK {
      NAVIGATE("creators/voxelwizard")
    }
  }
  
  ENTITY creator_booth_2 {
    position: (10, 2, 0)
    model: "assets/booth.glb"
    
    ON_HOVER {
      SHOW_MESSAGE("PixelForge Studio")
    }
    
    ON_CLICK {
      NAVIGATE("creators/pixelforge")
    }
  }
  
  ENTITY leaderboard_display {
    position: (6, 3, 12)
    model: "assets/leaderboard_display.glb"
    
    ON_CLICK {
      NAVIGATE("ui/top_creators")
    }
  }
}

// ============================================================================
// ZONE: Arcade - Games and fun
// ============================================================================
ZONE arcade {
  position: (0, 0, 20)
  
  ENTITY tetris_game {
    position: (-8, 2, 0)
    model: "assets/arcade_cabinet.glb"
    
    ON_CLICK {
      LAUNCH_GAME("tetris")
    }
  }
  
  ENTITY pac_man_game {
    position: (0, 2, 0)
    model: "assets/arcade_cabinet.glb"
    
    ON_CLICK {
      LAUNCH_GAME("pacman")
    }
  }
  
  ENTITY trivia_game {
    position: (8, 2, 0)
    model: "assets/arcade_cabinet.glb"
    
    ON_CLICK {
      LAUNCH_GAME("trivia")
    }
  }
}

// ============================================================================
// ZONE: Central Park - Social/chill space
// ============================================================================
ZONE central_park {
  position: (0, 0, -20)
  
  ENTITY park_bench {
    position: (-5, 0.5, 0)
    model: "assets/bench.glb"
  }
  
  ENTITY tree_1 {
    position: (-10, 0, 5)
    model: "assets/tree.glb"
  }
  
  ENTITY tree_2 {
    position: (10, 0, 5)
    model: "assets/tree.glb"
  }
  
  ENTITY fountain {
    position: (0, 0, -5)
    model: "assets/fountain.glb"
    
    ANIMATE {
      property: "position.y"
      from: 0
      to: 0.5
      duration: 2s
      loop: true
    }
  }
  
  ENTITY event_stage {
    position: (0, 2, -15)
    model: "assets/stage.glb"
    
    ON_CLICK {
      NAVIGATE("ui/events")
    }
  }
}

// ============================================================================
// ZONE: Gym - Fitness/training space
// ============================================================================
ZONE brians_gym {
  position: (20, 0, 20)
  
  ENTITY treadmill {
    position: (-5, 1, 0)
    model: "assets/treadmill.glb"
    
    ON_CLICK {
      START_ACTIVITY("treadmill")
    }
  }
  
  ENTITY weights {
    position: (0, 1, 0)
    model: "assets/weights.glb"
    
    ON_CLICK {
      START_ACTIVITY("weights")
    }
  }
  
  ENTITY yoga_mat {
    position: (5, 0, 0)
    model: "assets/yoga_mat.glb"
    
    ON_CLICK {
      START_ACTIVITY("yoga")
    }
  }
  
  ENTITY gym_owner {
    position: (-10, 1.7, -5)
    model: "assets/hologram_person.glb"
    
    ON_CLICK {
      SHOW_DIALOG("Welcome to Brian's Gym!", {
        message: "Get fit in VR!",
        buttons: ["Start Training", "Cancel"]
      })
    }
  }
}

// ============================================================================
// ZONE: B2B Hub - Business/enterprise space
// ============================================================================
ZONE b2b_hub {
  position: (-20, 0, 20)
  
  ENTITY conference_room {
    position: (0, 2, 0)
    model: "assets/conference_room.glb"
    
    ON_CLICK {
      NAVIGATE("rooms/conference")
    }
  }
  
  ENTITY meeting_booths {
    position: (10, 2, 0)
    model: "assets/meeting_booth.glb"
    
    ON_CLICK {
      SCHEDULE_MEETING()
    }
  }
  
  ENTITY presentation_stage {
    position: (-10, 2, 10)
    model: "assets/stage.glb"
    
    ON_CLICK {
      NAVIGATE("presentations")
    }
  }
}
