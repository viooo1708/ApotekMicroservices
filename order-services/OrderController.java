@RestController
@RequestMapping("/orders")
public class OrderController {

    @Autowired
    JdbcTemplate jdbc;

    @GetMapping
    public List<Map<String,Object>> orders(){
        return jdbc.queryForList("SELECT * FROM orders");
    }
}
