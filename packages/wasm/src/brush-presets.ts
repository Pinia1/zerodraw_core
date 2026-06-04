export interface BrushPreset {
    name: string;
    category: string;
    data: any; // the raw .myb JSON
  }
  
  export const BRUSH_PRESETS: BrushPreset[] = [
    {
      name: "\u70AD\u7B14",
      category: "\u7ECF\u5178",
      data: {
        "comment": "MyPaint brush file",
        "group": "",
        "parent_brush_name": "",
        "settings": {
          "anti_aliasing": { "base_value": 0.0, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.6354166666666666, "inputs": {} },
          "color_s": { "base_value": 0.8807339449541285, "inputs": {} },
          "color_v": { "base_value": 0.42745098039215684, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 5.0, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 0.0, "inputs": {} },
          "dabs_per_second": { "base_value": 0.0, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": { "base_value": 90.0, "inputs": {} },
          "elliptical_dab_ratio": { "base_value": 1.0, "inputs": {} },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": { "base_value": 0.2, "inputs": {} },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": {
            "base_value": 1.6,
            "inputs": { "pressure": [[0, 0], [1.0, -1.4]] }
          },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": {
            "base_value": 0.4,
            "inputs": { "pressure": [[0, 0], [1.0, 0.4]] }
          },
          "opaque_linearize": { "base_value": 0.0, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": { "pressure": [[0, 0], [1.0, 1.0]] }
          },
          "radius_by_random": { "base_value": 0.0, "inputs": {} },
          "radius_logarithmic": { "base_value": 0.7, "inputs": {} },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 2.0, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 0.0, "inputs": {} },
          "smudge": { "base_value": 0.0, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 4.0, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u4E66\u6CD5",
      category: "\u7ECF\u5178",
      data: {
        "comment": "MyPaint brush file",
        "description": "",
        "group": "",
        "notes": "",
        "parent_brush_name": "classic/calligraphy",
        "settings": {
          "anti_aliasing": { "base_value": 3.53, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 2.2, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 0.0, "inputs": {} },
          "dabs_per_second": { "base_value": 0.0, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": { "base_value": 45.92, "inputs": {} },
          "elliptical_dab_ratio": { "base_value": 5.46, "inputs": {} },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": {
            "base_value": 0.74,
            "inputs": {
              "pressure": [[0.0, 0.0], [1.0, 0.05]],
              "speed1": [[0.0, -0.0], [1.0, -0.04]]
            }
          },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": { "base_value": 1.0, "inputs": {} },
          "opaque_linearize": { "base_value": 0.0, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": {
              "pressure": [[0.0, 0.0], [0.015, 0.0], [0.015, 1.0], [1.0, 1.0]]
            }
          },
          "pressure_gain_log": { "base_value": 0.0, "inputs": {} },
          "radius_by_random": { "base_value": 0.0, "inputs": {} },
          "radius_logarithmic": {
            "base_value": 2.02,
            "inputs": {
              "pressure": [[0.0, 0.0], [1.0, 0.5]],
              "speed1": [[0.0, -0.0], [1.0, -0.12]]
            }
          },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 0.65, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 0.8, "inputs": {} },
          "smudge": { "base_value": 0.0, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "snap_to_pixel": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 2.87, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u94A2\u7B14",
      category: "\u7ECF\u5178",
      data: {
        "comment": "MyPaint brush file",
        "description": "",
        "group": "",
        "notes": "",
        "parent_brush_name": "classic/pen",
        "settings": {
          "anti_aliasing": { "base_value": 1.0, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 2.2, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 0.0, "inputs": {} },
          "dabs_per_second": { "base_value": 0.0, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": { "base_value": 90.0, "inputs": {} },
          "elliptical_dab_ratio": { "base_value": 1.0, "inputs": {} },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": {
            "base_value": 0.9,
            "inputs": {
              "pressure": [[0.0, 0.0], [1.0, 0.05]],
              "speed1": [[0.0, -0.0], [1.0, -0.09]]
            }
          },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": { "base_value": 1.0, "inputs": {} },
          "opaque_linearize": { "base_value": 0.9, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": {
              "pressure": [[0.0, 0.0], [0.015, 0.0], [0.015, 1.0], [1.0, 1.0]]
            }
          },
          "pressure_gain_log": { "base_value": 0.0, "inputs": {} },
          "radius_by_random": { "base_value": 0.0, "inputs": {} },
          "radius_logarithmic": {
            "base_value": 0.96,
            "inputs": {
              "pressure": [[0.0, 0.0], [1.0, 0.5]],
              "speed1": [[0.0, -0.0], [1.0, -0.15]]
            }
          },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 0.65, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 0.8, "inputs": {} },
          "smudge": { "base_value": 0.0, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "snap_to_pixel": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 2.87, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u94C5\u7B14",
      category: "\u7ECF\u5178",
      data: {
        "comment": "MyPaint brush file",
        "group": "",
        "parent_brush_name": "classic/pencil",
        "settings": {
          "anti_aliasing": { "base_value": 0.0, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 4.0, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 0.0, "inputs": {} },
          "dabs_per_second": { "base_value": 0.0, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": { "base_value": 90.0, "inputs": {} },
          "elliptical_dab_ratio": { "base_value": 1.0, "inputs": {} },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": {
            "base_value": 0.1,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, 0.3]] }
          },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": {
            "base_value": 0.5,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, -0.3]] }
          },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": { "base_value": 0.7, "inputs": {} },
          "opaque_linearize": { "base_value": 0.9, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, 1.0]] }
          },
          "radius_by_random": { "base_value": 0.0, "inputs": {} },
          "radius_logarithmic": { "base_value": 0.2, "inputs": {} },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 1.0, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 0.0, "inputs": {} },
          "smudge": { "base_value": 0.0, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 4.0, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u5E72\u7B14\u5237",
      category: "\u7ECF\u5178",
      data: {
        "comment": "MyPaint brush file",
        "description": "",
        "group": "",
        "notes": "",
        "parent_brush_name": "classic/dry_brush",
        "settings": {
          "anti_aliasing": { "base_value": 0.0, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 6.0, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 6.0, "inputs": {} },
          "dabs_per_second": { "base_value": 0.0, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": { "base_value": 90.0, "inputs": {} },
          "elliptical_dab_ratio": { "base_value": 1.0, "inputs": {} },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": { "base_value": 0.2, "inputs": {} },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": {
            "base_value": 0.0,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, 1.4]] }
          },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": {
            "base_value": 0.8,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, 0.2]] }
          },
          "opaque_linearize": { "base_value": 0.0, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, 1.0]] }
          },
          "pressure_gain_log": { "base_value": 0.0, "inputs": {} },
          "radius_by_random": { "base_value": 0.1, "inputs": {} },
          "radius_logarithmic": {
            "base_value": 0.6,
            "inputs": { "speed2": [[0.0, 0.042857], [4.0, -0.3]] }
          },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 2.0, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 0.0, "inputs": {} },
          "smudge": { "base_value": 0.0, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "snap_to_pixel": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 4.0, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u58A8\u70B9",
      category: "\u7ECF\u5178",
      data: {
        "comment": "MyPaint brush file",
        "description": "",
        "group": "",
        "notes": "",
        "parent_brush_name": "classic/ink_blot",
        "settings": {
          "anti_aliasing": { "base_value": 1.0, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 3.32, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 0.0, "inputs": {} },
          "dabs_per_second": { "base_value": 15.0, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": { "base_value": 90.0, "inputs": {} },
          "elliptical_dab_ratio": { "base_value": 1.0, "inputs": {} },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": { "base_value": 0.28, "inputs": {} },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": { "base_value": 0.17, "inputs": {} },
          "offset_by_speed": {
            "base_value": 0.02,
            "inputs": { "custom": [[-2.0, 0.0], [2.0, 0.0]] }
          },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": { "base_value": 1.0, "inputs": {} },
          "opaque_linearize": { "base_value": 0.9, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, 1.0]] }
          },
          "pressure_gain_log": { "base_value": 0.0, "inputs": {} },
          "radius_by_random": { "base_value": 0.63, "inputs": {} },
          "radius_logarithmic": { "base_value": 2.5, "inputs": {} },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 0.0, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 0.0, "inputs": {} },
          "smudge": { "base_value": 0.0, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "snap_to_pixel": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 4.0, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u6F2B\u753B\u7B14",
      category: "\u7ECF\u5178",
      data: {
        "comment": "MyPaint brush file",
        "description": "",
        "group": "",
        "notes": "",
        "parent_brush_name": "classic/kabura",
        "settings": {
          "anti_aliasing": { "base_value": 0.93, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 2.0, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 3.24, "inputs": {} },
          "dabs_per_second": { "base_value": 48.87, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": { "base_value": 90.0, "inputs": {} },
          "elliptical_dab_ratio": { "base_value": 1.0, "inputs": {} },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": { "base_value": 0.43, "inputs": {} },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": {
            "base_value": 1.29,
            "inputs": {
              "pressure": [[0.0, -0.989583], [0.38253, -0.59375], [0.656627, 0.041667], [1.0, 1.0]]
            }
          },
          "opaque_linearize": { "base_value": 0.29, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": {
              "pressure": [[0.0, 0.0], [0.015, 0.0], [0.069277, 0.9375], [0.25, 1.0], [1.0, 1.0]]
            }
          },
          "pressure_gain_log": { "base_value": 0.0, "inputs": {} },
          "radius_by_random": { "base_value": 0.0, "inputs": {} },
          "radius_logarithmic": {
            "base_value": 0.92,
            "inputs": {
              "pressure": [[0.0, -0.7875], [0.237952, -0.6], [0.5, -0.15], [0.76506, 0.6], [1.0, 0.9]]
            }
          },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 0.0, "inputs": {} },
          "slow_tracking_per_dab": {
            "base_value": 10.0,
            "inputs": {
              "speed1": [[0.0, -1.428571], [4.0, 10.0]],
              "speed2": [[0.0, -1.428571], [4.0, 10.0]]
            }
          },
          "smudge": { "base_value": 0.0, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "snap_to_pixel": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 2.87, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u7C97\u9A6C\u514B\u7B14",
      category: "\u7ECF\u5178",
      data: {
        "comment": "MyPaint brush file",
        "group": "",
        "parent_brush_name": "classic/marker_fat",
        "settings": {
          "anti_aliasing": { "base_value": 0.78, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 2.0, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 1.5, "inputs": {} },
          "dabs_per_second": { "base_value": 0.0, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": {
            "base_value": 113.08,
            "inputs": { "tilt_ascension": [[-180.0, -180.0], [180.0, 180.0]] }
          },
          "elliptical_dab_ratio": {
            "base_value": 10.0,
            "inputs": {
              "tilt_declination": [[0.0, -0.0], [68.042169, -9.0], [90.0, -9.0]]
            }
          },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": { "base_value": 1.0, "inputs": {} },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 0.0, "inputs": {} },
          "opaque": { "base_value": 1.0, "inputs": {} },
          "opaque_linearize": { "base_value": 0.9, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": {
              "pressure": [[0.0, 0.0], [0.060241, 1.0], [1.0, 1.0]]
            }
          },
          "radius_by_random": { "base_value": 0.0, "inputs": {} },
          "radius_logarithmic": {
            "base_value": 2.48,
            "inputs": {
              "tilt_declination": [[20.0, -0.0], [50.0, -0.0], [80.0, -1.0]]
            }
          },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 3.0, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 0.0, "inputs": {} },
          "smudge": { "base_value": 0.0, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 4.0, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u6BDB\u7B14",
      category: "\u7ECF\u5178",
      data: {
        "comment": "MyPaint brush file",
        "group": "",
        "parent_brush_name": "classic/brush",
        "settings": {
          "anti_aliasing": { "base_value": 1.0, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 5.82, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 0.51, "inputs": {} },
          "dabs_per_second": { "base_value": 70.0, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": { "base_value": 90.0, "inputs": {} },
          "elliptical_dab_ratio": { "base_value": 1.0, "inputs": {} },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": { "base_value": 0.89, "inputs": {} },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": {
            "base_value": 1.0,
            "inputs": {
              "pressure": [[0.0, -0.989583], [0.38253, -0.59375], [0.656627, 0.041667], [1.0, 1.0]]
            }
          },
          "opaque_linearize": { "base_value": 0.44, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": {
              "pressure": [[0.0, 0.0], [0.015, 0.0], [0.069277, 0.9375], [0.25, 1.0], [1.0, 1.0]]
            }
          },
          "radius_by_random": { "base_value": 0.0, "inputs": {} },
          "radius_logarithmic": {
            "base_value": 1.01,
            "inputs": {
              "pressure": [[0.0, -1.86375], [0.237952, -1.42], [0.5, -0.355], [0.76506, 1.42], [1.0, 2.13]]
            }
          },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 4.47, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 2.48, "inputs": {} },
          "smudge": { "base_value": 0.0, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 2.87, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u5370\u8C61\u6D3E",
      category: "\u7ECF\u5178",
      data: {
        "comment": "MyPaint brush file",
        "description": "",
        "group": "impressionism",
        "notes": "",
        "parent_brush_name": "classic/impressionism",
        "settings": {
          "anti_aliasing": { "base_value": 0.66, "inputs": {} },
          "change_color_h": {
            "base_value": 0.0,
            "inputs": { "custom": [[-2.0, -0.04], [2.0, 0.04]] }
          },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": {
            "base_value": 0.0,
            "inputs": { "stroke": [[0.0, 0.0], [0.87963, 0.02], [1.0, 0.0]] }
          },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": {
            "base_value": 0.0,
            "inputs": { "random": [[0.0, -10.0], [1.0, 10.0]] }
          },
          "custom_input_slowness": {
            "base_value": 0.0,
            "inputs": { "tilt_declination": [[0.0, 4.41], [90.0, 0.0]] }
          },
          "dabs_per_actual_radius": { "base_value": 6.0, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 6.0, "inputs": {} },
          "dabs_per_second": { "base_value": 80.0, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": {
            "base_value": 0.0,
            "inputs": { "direction": [[0.0, 0.0], [180.0, 180.0]] }
          },
          "elliptical_dab_ratio": {
            "base_value": 7.1,
            "inputs": {
              "speed1": [[0.0, -0.2657141153846154], [4.0, 1.86]],
              "stroke": [[0.0, -0.4], [1.0, 0.4]],
              "tilt_declination": [[0.0, 3.636875], [90.0, -7.59]]
            }
          },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": { "base_value": 0.8, "inputs": {} },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": {
            "base_value": 0.6,
            "inputs": {
              "tilt_declination": [[0.0, 0.0], [45.0, 0.0], [90.0, 0.63]]
            }
          },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": {
            "base_value": 1.0,
            "inputs": {
              "pressure": [[0.0, 0.0], [0.166667, 0.75], [1.0, 1.0]]
            }
          },
          "opaque_linearize": { "base_value": 0.9, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": {
              "pressure": [[0.0, 0.0], [0.067901, 0.78125], [0.185185, 1.0], [1.0, 1.0]]
            }
          },
          "pressure_gain_log": { "base_value": 0.0, "inputs": {} },
          "radius_by_random": { "base_value": 0.0, "inputs": {} },
          "radius_logarithmic": {
            "base_value": 2.0,
            "inputs": {
              "pressure": [[0.0, -2.0], [0.401235, 0.0], [1.0, 0.0]],
              "tilt_declination": [[0.0, 0.0], [45.0, 0.0], [90.0, -1.6]]
            }
          },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 0.0, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 0.0, "inputs": {} },
          "smudge": {
            "base_value": 0.9,
            "inputs": {
              "pressure": [[0.0, 0.510417], [1.0, -1.0]],
              "stroke": [[0.0, 0.0], [1.0, 1.0]]
            }
          },
          "smudge_length": {
            "base_value": 0.0,
            "inputs": { "stroke": [[0.0, 1.0], [1.0, -1.0]] }
          },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "snap_to_pixel": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 4.0, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 6.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 10.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.2, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u6DF7\u5408\u7ED8\u753B",
      category: "\u7ECF\u5178",
      data: {
        "comment": "MyPaint brush file",
        "group": "",
        "parent_brush_name": "",
        "settings": {
          "anti_aliasing": { "base_value": 0.0, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 6.0, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 0.0, "inputs": {} },
          "dabs_per_second": { "base_value": 54.45, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": { "base_value": 90.0, "inputs": {} },
          "elliptical_dab_ratio": { "base_value": 1.0, "inputs": {} },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": { "base_value": 0.69, "inputs": {} },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": { "base_value": 0.85, "inputs": {} },
          "opaque_linearize": { "base_value": 0.9, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": {
              "pressure": [[0.0, 0.0], [0.222222, 0.0], [0.324074, 1.0], [1.0, 1.0]]
            }
          },
          "radius_by_random": { "base_value": 0.0, "inputs": {} },
          "radius_logarithmic": { "base_value": 2.6, "inputs": {} },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 0.0, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 0.0, "inputs": {} },
          "smudge": { "base_value": 0.9, "inputs": {} },
          "smudge_length": { "base_value": 0.12, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 4.0, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u539A\u6D82",
      category: "\u7ECF\u5178",
      data: {
        "comment": "MyPaint brush file",
        "group": "",
        "parent_brush_name": "classic/bulk",
        "settings": {
          "anti_aliasing": { "base_value": 1.37, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 2.0, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 0.0, "inputs": {} },
          "dabs_per_second": { "base_value": 0.0, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": { "base_value": 90.0, "inputs": {} },
          "elliptical_dab_ratio": { "base_value": 1.0, "inputs": {} },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": {
            "base_value": 0.19,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, 1.0]] }
          },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": { "base_value": 1.38, "inputs": {} },
          "opaque_linearize": { "base_value": 0.9, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": {
              "pressure": [[0.0, 0.0], [0.052469, 0.625], [0.166667, 1.0], [1.0, 1.0]]
            }
          },
          "radius_by_random": { "base_value": 0.0, "inputs": {} },
          "radius_logarithmic": { "base_value": 3.59, "inputs": {} },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 0.0, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 0.0, "inputs": {} },
          "smudge": { "base_value": 0.0, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 4.0, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u6C34\u5F69",
      category: "Deevad",
      data: {
        "comment": "MyPaint brush file",
        "description": "A watercolor brush preset to glaze area",
        "group": "",
        "notes": "A brush preset part of the Brushkit v0.6 \n created in october 2012 by David Revoy ( aka Deevad ) \n source: http://www.davidrevoy.com/article142/ressource-mypaint-brushes \n license: CC-Zero/Public-Domain",
        "parent_brush_name": "deevad/watercolor_glazing",
        "settings": {
          "anti_aliasing": { "base_value": 1.0, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 6.0, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 6.0, "inputs": {} },
          "dabs_per_second": { "base_value": 0.0, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": {
            "base_value": 90.0,
            "inputs": { "random": [[0.0, -180.0], [1.0, 180.0]] }
          },
          "elliptical_dab_ratio": {
            "base_value": 10.0,
            "inputs": {
              "speed1": [[0.0, -3.34], [0.962963, -0.9045833333333331], [4.0, 0.0]]
            }
          },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": { "base_value": 0.41, "inputs": {} },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": {
            "base_value": 1.44,
            "inputs": {
              "pressure": [[0.0, -0.43125], [0.258721, -0.277917], [0.540698, 0.0], [1.0, 0.92]]
            }
          },
          "opaque_linearize": { "base_value": 0.9, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": {
              "pressure": [[0.0, 0.0], [0.058642, 0.604167], [1.0, 1.0]]
            }
          },
          "pressure_gain_log": { "base_value": 0.0, "inputs": {} },
          "radius_by_random": { "base_value": 0.0, "inputs": {} },
          "radius_logarithmic": {
            "base_value": 2.6,
            "inputs": {
              "pressure": [[0.0, -0.653333], [1.0, 0.98]]
            }
          },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 0.0, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 0.0, "inputs": {} },
          "smudge": { "base_value": 0.9, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "snap_to_pixel": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 4.0, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.9, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "\u55B7\u6E85",
      category: "Deevad",
      data: {
        "comment": "MyPaint brush file",
        "group": "",
        "description": "Throw particles on the canvas, simulate spray bomb",
        "notes": "A brush preset part of the Brushkit v0.6 \n created in october 2012 by David Revoy ( aka Deevad ) \n source: http://www.davidrevoy.com/article142/ressource-mypaint-brushes \n license: CC-Zero/Public-Domain",
        "parent_brush_name": "",
        "settings": {
          "anti_aliasing": { "base_value": 1.0, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.0, "inputs": {} },
          "color_s": { "base_value": 0.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 0.95, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 3.92, "inputs": {} },
          "dabs_per_second": { "base_value": 74.55, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": { "base_value": 90.0, "inputs": {} },
          "elliptical_dab_ratio": { "base_value": 1.0, "inputs": {} },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": { "base_value": 0.43, "inputs": {} },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": { "base_value": 2.0, "inputs": {} },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": {
            "base_value": 1.0,
            "inputs": {
              "stroke": [[0.0, 0.0], [0.62963, 0.0], [1.0, -1.0]]
            }
          },
          "opaque_linearize": { "base_value": 0.0, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, 1.0]] }
          },
          "radius_by_random": { "base_value": 0.28, "inputs": {} },
          "radius_logarithmic": {
            "base_value": 2.19,
            "inputs": {
              "stroke": [[0.0, 0.0], [0.54321, -1.82], [1.0, -0.0]]
            }
          },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 0.83, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 0.0, "inputs": {} },
          "smudge": { "base_value": 0.0, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 4.0, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": {
            "base_value": 1.47,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, -1.55]] }
          },
          "stroke_holdtime": { "base_value": 1.44, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 1.36, "inputs": {} }
        },
        "version": 3
      }
    },
    {
      name: "2B\u94C5\u7B14",
      category: "Deevad",
      data: {
        "comment": "MyPaint brush file",
        "group": "",
        "description": "A digital pencil soft 2B",
        "notes": "A brush preset part of the Brushkit v0.6 \n created in october 2012 by David Revoy ( aka Deevad ) \n source: http://www.davidrevoy.com/article142/ressource-mypaint-brushes \n license: CC-Zero/Public-Domain",
        "parent_brush_name": "",
        "settings": {
          "anti_aliasing": { "base_value": 0.0, "inputs": {} },
          "change_color_h": { "base_value": 0.0, "inputs": {} },
          "change_color_hsl_s": { "base_value": 0.0, "inputs": {} },
          "change_color_hsv_s": { "base_value": 0.0, "inputs": {} },
          "change_color_l": { "base_value": 0.0, "inputs": {} },
          "change_color_v": { "base_value": 0.0, "inputs": {} },
          "color_h": { "base_value": 0.02525252525252525, "inputs": {} },
          "color_s": { "base_value": 1.0, "inputs": {} },
          "color_v": { "base_value": 0.0, "inputs": {} },
          "colorize": { "base_value": 0.0, "inputs": {} },
          "custom_input": { "base_value": 0.0, "inputs": {} },
          "custom_input_slowness": { "base_value": 0.0, "inputs": {} },
          "dabs_per_actual_radius": { "base_value": 4.0, "inputs": {} },
          "dabs_per_basic_radius": { "base_value": 0.0, "inputs": {} },
          "dabs_per_second": { "base_value": 0.0, "inputs": {} },
          "direction_filter": { "base_value": 2.0, "inputs": {} },
          "elliptical_dab_angle": { "base_value": 90.0, "inputs": {} },
          "elliptical_dab_ratio": { "base_value": 1.0, "inputs": {} },
          "eraser": { "base_value": 0.0, "inputs": {} },
          "hardness": {
            "base_value": 0.2,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, 0.3]] }
          },
          "lock_alpha": { "base_value": 0.0, "inputs": {} },
          "offset_by_random": {
            "base_value": 0.5,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, -0.3]] }
          },
          "offset_by_speed": { "base_value": 0.0, "inputs": {} },
          "offset_by_speed_slowness": { "base_value": 1.0, "inputs": {} },
          "opaque": { "base_value": 0.15000000000027122, "inputs": {} },
          "opaque_linearize": { "base_value": 0.0, "inputs": {} },
          "opaque_multiply": {
            "base_value": 0.0,
            "inputs": { "pressure": [[0.0, 0.0], [1.0, 1.0]] }
          },
          "radius_by_random": { "base_value": 0.0, "inputs": {} },
          "radius_logarithmic": {
            "base_value": 0.75,
            "inputs": {
              "pressure": [[0.0, -0.687917], [0.752976, 0.236471], [1.0, 0.286632]]
            }
          },
          "restore_color": { "base_value": 0.0, "inputs": {} },
          "slow_tracking": { "base_value": 1.03, "inputs": {} },
          "slow_tracking_per_dab": { "base_value": 1.5, "inputs": {} },
          "smudge": { "base_value": 0.0, "inputs": {} },
          "smudge_length": { "base_value": 0.5, "inputs": {} },
          "smudge_radius_log": { "base_value": 0.0, "inputs": {} },
          "speed1_gamma": { "base_value": 4.0, "inputs": {} },
          "speed1_slowness": { "base_value": 0.04, "inputs": {} },
          "speed2_gamma": { "base_value": 4.0, "inputs": {} },
          "speed2_slowness": { "base_value": 0.8, "inputs": {} },
          "stroke_duration_logarithmic": { "base_value": 4.0, "inputs": {} },
          "stroke_holdtime": { "base_value": 0.0, "inputs": {} },
          "stroke_threshold": { "base_value": 0.0, "inputs": {} },
          "tracking_noise": { "base_value": 0.0, "inputs": {} }
        },
        "version": 3
      }
    }
  ];
  
  export default BRUSH_PRESETS;
  