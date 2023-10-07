const vertexShader = `
precision mediump float;

uniform float max_amplitude;
uniform vec2 resolution;
uniform sampler2D samples;
uniform vec2 sample_scale;
uniform bool b_should_interpolate;

attribute float index;

float decode(vec2 c) {
    float unscaled = (c.x * 255.0 * 256.0 + c.y * 255.0) / (256.0 * 256.0 - 1.0);
    return (unscaled * 2.0 - 1.0) * max_amplitude;
}

vec2 interpolate_sample(int i) {
    // calculate the size of single pixel in normalized coords
    float texture_size_x = float(textureSize(samples, 0).x);
    float texel_size_x = 1.0 / texture_size_x; 

    // normalize the input coordinate (range 0-1)
    float norm_x = float(i) / sample_scale.x;
    
    float nearest_tex_x_below = 1.0 * floor(norm_x * texture_size_x);
    vec2 tex_coord_below_norm = vec2(nearest_tex_x_below  / texture_size_x, 0.0);
    vec2 tex_coord_above_norm = tex_coord_below_norm + vec2(texel_size_x, 0.0);

    // Sample the 1D texture above and below
    vec4 sample_below = texture2D(samples, tex_coord_below_norm);
    vec4 sample_above = texture2D(samples, tex_coord_above_norm);

    // decode the byte structures into a 2D xy coordinate
    vec2 nearest_below = vec2(decode(sample_below.rg), decode(sample_below.ba));
    vec2 nearest_above = vec2(decode(sample_above.rg), decode(sample_above.ba));
    
    // Interpolate between the coords
    float a = fract((norm_x - tex_coord_below_norm.x) / texel_size_x );
    return mix(nearest_below, nearest_above, a);
}

vec2 get_sample(int i, bool interp) {
    if (interp){
        return interpolate_sample(i);
    }
    // normalize the coordinate (range 0-1) and then sample the 1D texture
    vec4 my_sample = texture2D(samples, vec2(i, 0.0) / sample_scale);
    
    // decode the byte structure into a 2D xy coordinate
    return vec2(decode(my_sample.rg), decode(my_sample.ba));
}

const float t_max = 5.0;
const float t_min = 1.0;
const float t_flat = 0.005;

void main() {
    // Read off the row/col texture coordinates
    int i = int(index);
    int j = 0;
    
    // translate to screen x/y
    vec2 pos = get_sample(i, b_should_interpolate);

    vec2 prev_pos = get_sample(i - 1, b_should_interpolate);
    vec2 next_pos = get_sample(i + 1, b_should_interpolate);

    float prev_len = distance(pos, prev_pos);
    float next_len = distance(pos, next_pos);
    float avg_len = mix(prev_len, next_len, 0.5);

    float thickness = (t_max - t_min) * t_flat / (t_flat + avg_len) + t_min;
    
    vec2 delta = vec2(0.0, 0.0);
    if (j == 0) {
        delta = pos - prev_pos;
    } else if (j == 1) {
        delta = prev_pos - pos;
    } else if (j == 2) {
        delta = next_pos - pos;
    } else if (j == 3) {
        delta = pos - next_pos;
    }

    float side = min(resolution.x, resolution.y);

    // pos = pos + thickness / side * normalize(vec2(-delta.y, delta.x));

    gl_PointSize = 3.0 + 5.0 * thickness / side;

    if (resolution.x < resolution.y) {
        pos = pos.yx;
    }
    gl_Position = vec4(pos / resolution * side, 0.0, 1.0);


    // // Pass info to fragment shader
    // relative_length = avg_len;
    // norm_index = float(i) / sample_scale.x;
    // vec2 diff = next_pos - prev_pos;
    // // angle = ...
}
`;

export default vertexShader;
