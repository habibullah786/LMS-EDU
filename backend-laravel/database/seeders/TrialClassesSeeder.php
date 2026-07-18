<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TrialClassesSeeder extends Seeder
{
    public function run(): void
    {
        $locations = [
            ['name' => 'Thornhill',        'campus_type' => '1'],
            ['name' => 'Richmond Hill',    'campus_type' => '3'],
            ['name' => 'Yonge & Lawrence', 'campus_type' => '6'],
            ['name' => 'Delhi',            'campus_type' => ''],
            ['name' => 'Bengaluru',        'campus_type' => ''],
            ['name' => 'Kolkata',          'campus_type' => ''],
        ];

        // Each entry: [age_group_label, course, orbund_program_id, orbund_level_id]
        $ageGroups = [
            ['7 Years Old',            'Robotics', '4001270', '4000281'],
            ['8 Years Old',            'Robotics', '4001271', '4000281'],
            ['9–11 Years Old',         'Robotics', '4001272', '4000281'],
            ['12–15 Years Old',        'Robotics', '4001273', '4000281'],
            ['12–15 Years Old',        'Coding',   '4001274', '4000282'],
        ];

        // Upcoming weekend dates (Saturdays & Sundays)
        $dates = [
            '2026-07-05', '2026-07-06',
            '2026-07-12', '2026-07-13',
            '2026-07-19', '2026-07-20',
            '2026-07-26', '2026-07-27',
            '2026-08-02', '2026-08-03',
        ];

        $times = ['10:00 AM', '1:00 PM', '3:00 PM'];

        $rows   = [];
        $index  = 0;

        foreach ($locations as $location) {
            foreach ($ageGroups as $ag) {
                [$ageLabel, $course] = $ag;

                $curriculum = "{$course} Trial Class {$location['name']} {$ageLabel}";

                $rows[] = [
                    'curriculum'      => $curriculum,
                    'locations'       => json_encode([$location['name']]),
                    'age_groups'      => json_encode([$ageLabel]),
                    'course'          => $course,
                    'type'            => 'Trial',
                    'semester'        => '4000979',
                    'price'           => 0,
                    'date'            => $dates[$index % count($dates)],
                    'time'            => $times[$index % count($times)],
                    'available_slots' => 6,
                    'instructor'      => 'TBD',
                    'max_students'    => 6,
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ];

                $index++;
            }
        }

        foreach ($rows as $row) {
            DB::table('school_classes')->updateOrInsert(
                ['curriculum' => $row['curriculum'], 'date' => $row['date'], 'time' => $row['time']],
                $row
            );
        }

        $this->command->info('Inserted ' . count($rows) . ' trial classes.');
    }
}
